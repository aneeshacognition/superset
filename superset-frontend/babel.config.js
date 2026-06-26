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

// Babel 8 removed NodePath.prototype.hoist(), but @emotion/babel-plugin
// still calls it for CSS hoisting optimisation.  A no-op polyfill keeps
// the plugin functional (CSS is evaluated in-place instead of hoisted,
// a minor perf difference only).
const { NodePath } = require('@babel/traverse');
if (typeof NodePath.prototype.hoist !== 'function') {
  NodePath.prototype.hoist = function () {};
}

// Babel 8 renamed JSX builder helpers from jSX* to jsx* (lowercase).
// babel-plugin-jsx-remove-data-test-id still calls t.jSXOpeningElement.
// Because @babel/types is ESM in Babel 8, require() returns a fresh CJS
// wrapper each time, so we cannot patch the module directly.  Instead we
// wrap the plugin and proxy the types object it receives.
const _origRemoveTestId = require('babel-plugin-jsx-remove-data-test-id');
const _removeTestIdFn = _origRemoveTestId.default || _origRemoveTestId;
function removeDataTestIdCompat(api, options) {
  const proxiedTypes = new Proxy(api.types, {
    get(target, prop, receiver) {
      if (prop === 'jSXOpeningElement') return target.jsxOpeningElement;
      return Reflect.get(target, prop, receiver);
    },
  });
  return _removeTestIdFn({ ...api, types: proxiedTypes }, options);
}

module.exports = {
  sourceMaps: true,
  sourceType: 'module',
  retainLines: true,
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
      {
        modules: false,
        targets: packageConfig.browserslist,
      },
    ],
    [
      '@babel/preset-react',
      {
        development: process.env.BABEL_ENV === 'development',
        runtime: 'automatic',
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [
    'lodash',
    // In Babel 8, plugins execute before presets.  The transform plugins
    // below are already shipped inside @babel/preset-env and must run
    // AFTER @babel/preset-typescript (a preset) strips TS-only syntax
    // such as `declare` fields and definite-assignment assertions (`!`).
    // Listing them here as explicit plugins would make them run first,
    // causing "TypeScript 'declare' fields must first be transformed"
    // errors.  Removed: plugin-transform-class-properties,
    // plugin-transform-class-static-block, plugin-transform-optional-chaining,
    // plugin-transform-private-methods, plugin-transform-nullish-coalescing-operator,
    // plugin-transform-export-namespace-from.
    '@babel/plugin-transform-runtime',
    ['babel-plugin-polyfill-corejs3', { method: 'usage-pure' }],
    [
      '@emotion/babel-plugin',
      {
        autoLabel: 'dev-only',
        labelFormat: '[local]',
      },
    ],
  ],
  env: {
    // Setup a different config for tests as they run in node instead of a browser
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: 'auto',
            targets: { node: 'current' },
          },
        ],
        [
          '@babel/preset-react',
          {
            development: process.env.BABEL_ENV === 'development',
            runtime: 'automatic',
          },
        ],
        '@babel/preset-typescript',
      ],
      plugins: [
        'babel-plugin-dynamic-import-node',
        '@babel/plugin-transform-modules-commonjs',
      ],
    },
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
  ],
};
