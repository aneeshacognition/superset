/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const packageConfig = require('./package');

// Babel 8 renamed JSX builder helpers from jSX* to jsx* (lowercase).
// babel-plugin-jsx-remove-data-test-id still calls t.jSXOpeningElement.
// Because @babel/types is ESM in Babel 8, require() returns a fresh CJS
// wrapper each time, so module-level patching is ineffective.  Wrap the
// plugin with a Proxy that maps the old names to the new ones.
const _origRemoveTestId = require('babel-plugin-jsx-remove-data-test-id');
const _removeTestIdFn = _origRemoveTestId.default || _origRemoveTestId;
function removeDataTestIdCompat(api, options) {
  const proxiedTypes = new Proxy(api.types, {
    get(target, prop, receiver) {
      if (prop === 'jSXOpeningElement') return target.jsxOpeningElement;
      if (prop === 'isJSXOpeningElement') return target.isJSXOpeningElement;
      return Reflect.get(target, prop, receiver);
    },
  });
  return _removeTestIdFn({ ...api, types: proxiedTypes }, options);
}

const isTest =
  process.env.NODE_ENV === 'test' || process.env.BABEL_ENV === 'test';

module.exports = {
  sourceMaps: true,
  sourceType: 'module',
  retainLines: true,
  targets: isTest ? { node: 'current' } : packageConfig.browserslist,
  assumptions: {
    constantSuper: true,
    noDocumentAll: true,
    objectRestNoSymbols: true,
    privateFieldsAsProperties: true,
    pureGetters: true,
    setComputedProperties: true,
    setPublicClassFields: true,
    setSpreadProperties: true,
    superIsCallableConstructor: true,
  },
  presets: [
    [
      '@babel/preset-env',
      isTest ? { modules: 'commonjs' } : { modules: false },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [
    'lodash',
    ...(isTest
      ? ['babel-plugin-dynamic-import-node']
      : [
          '@babel/plugin-transform-runtime',
          ['babel-plugin-polyfill-corejs3', { method: 'usage-pure' }],
        ]),
  ],
  env: {
    // build instrumented code for testing code coverage with Cypress
    instrumented: {
      plugins: [
        [
          'istanbul',
          {
            exclude: ['plugins/**/*', 'packages/**/*'],
          },
        ],
      ],
    },
    production: {
      plugins: [
        [
          removeDataTestIdCompat,
          {
            // The plugin matches attribute names exactly (no prefix match),
            // so each data-test* attribute must be listed explicitly.
            attributes: [
              'data-test',
              'data-test-drag-source-id',
              'data-test-drop-target-id',
            ],
          },
        ],
      ],
    },
    testableProduction: {
      plugins: [],
    },
  },
  overrides: [
    {
      test: './plugins/plugin-chart-handlebars/node_modules/just-handlebars-helpers/*',
      sourceType: 'unambiguous',
    },
    {
      // Apply @babel/preset-react only to JSX-capable files (.tsx, .jsx, .js).
      // This prevents angle-bracket type assertions in .ts files from being
      // parsed as JSX elements (a Babel 8 parser change).
      test: /\.(tsx|jsx|js)$/,
      presets: [
        [
          '@babel/preset-react',
          {
            development: process.env.BABEL_ENV === 'development',
            runtime: 'automatic',
            importSource: '@emotion/react',
          },
        ],
      ],
    },
  ],
};
