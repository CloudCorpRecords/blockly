/**
 * @license
 * Copyright 2026 Raspberry Pi Foundation
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from '#core/blockly.js';
import {
  JavascriptGenerator,
  Order as JavascriptOrder,
} from '#generators/javascript/javascript_generator.js';
import {
  PythonGenerator,
  Order as PythonOrder,
} from '#generators/python/python_generator.js';
import {assert} from 'chai';
import {
  sharedTestSetup,
  sharedTestTeardown,
} from './test_helpers/setup_teardown.js';

suite('text_append forceString', function () {
  const wrapper: {workspace?: Blockly.Workspace} = {};

  setup(function (this: Mocha.Context) {
    sharedTestSetup.call(this);
    wrapper.workspace = new Blockly.Workspace();
    Blockly.defineBlocksWithJsonArray([
      {
        'type': 'test_value_block',
        'message0': '',
        'output': null,
      },
    ]);
  });

  teardown(function (this: Mocha.Context) {
    sharedTestTeardown.call(this, wrapper.workspace);
  });

  /**
   * Generates code for a text_append block whose TEXT input is a block
   * that generates exactly `value`, and returns the generated code.
   */
  function generateAppend(
    generator: Blockly.CodeGenerator,
    value: string,
    order: number,
  ): unknown {
    const workspace = wrapper.workspace;
    if (!workspace) throw new Error('no workspace');
    const variable = workspace.getVariableMap().createVariable('item');
    if (!variable) throw new Error('could not create variable');
    const appendBlock = workspace.newBlock('text_append');
    const field = appendBlock.getField('VAR');
    if (!field) throw new Error('text_append has no VAR field');
    field.setValue(variable.getId());
    const valueBlock = workspace.newBlock('test_value_block');
    const input = appendBlock.getInput('TEXT');
    if (!input || !input.connection || !valueBlock.outputConnection) {
      throw new Error('could not connect TEXT input');
    }
    input.connection.connect(valueBlock.outputConnection);
    generator.forBlock['test_value_block'] = function () {
      return [value, order];
    };
    generator.init(workspace);
    const code = generator.blockToCode(appendBlock);
    delete generator.forBlock['test_value_block'];
    return code;
  }

  // The value below is a single-quoted literal that never closes: an
  // opening quote, then C, colon, and three backslashes, then a quote
  // that is escaped by the third backslash. The old strRegExp matched
  // it as a string literal; the fixed one must not.
  const unterminated = "'" + 'C' + ':' + '\\'.repeat(3) + "'";

  test('Javascript leaves a valid literal alone', function () {
    const code = generateAppend(
      new JavascriptGenerator(),
      "'hello'",
      JavascriptOrder.ATOMIC,
    );
    assert.equal(code, "item += 'hello';\n");
  });

  test('Javascript wraps an unterminated literal', function () {
    const code = generateAppend(
      new JavascriptGenerator(),
      unterminated,
      JavascriptOrder.ATOMIC,
    );
    assert.equal(code, 'item += String(' + unterminated + ');\n');
  });

  test('Python leaves a valid literal alone', function () {
    const code = generateAppend(
      new PythonGenerator(),
      "'hello'",
      PythonOrder.ATOMIC,
    );
    assert.equal(code, "item = str(item) + 'hello'\n");
  });

  test('Python wraps an unterminated literal', function () {
    const code = generateAppend(
      new PythonGenerator(),
      unterminated,
      PythonOrder.ATOMIC,
    );
    assert.equal(code, 'item = str(item) + str(' + unterminated + ')\n');
  });
});
