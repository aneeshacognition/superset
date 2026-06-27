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

const isTest =
  process.env.NODE_ENV === 'test' || process.env.BABEL_ENV === 'test';

const basePlugins = [
  'lodash',
  '@babel/plugin-transform-export-namespace-from',
];

const buildPlugins = [
  ...basePlugins,
  '@babel/plugin-transform-runtime',
  [
    'babel-plugin-polyfill-corejs3',
    {
      method: 'usage-global',
      version: '3.38',
    },
  ],
];

const testPlugins = [...basePlugins, 'babel-plugin-dynamic-import-node'];

module.exports = {
  sourceMaps: true,
  sourceType: 'module',
  retainLines: true,
  targets: isTest ? { node: 'current' } : packageConfig.browserslist,
  assumptions: {
    arrayLikeIsIterable: true,
    ignoreFunctionLength: true,
    ignoreToPrimitiveHint: true,
    mutableTemplateObject: true,
    noClassCalls: true,
    noDocumentAll: true,
    objectRestNoSymbols: true,
    privateFieldsAsProperties: true,
    pureGetters: true,
    setClassMethods: true,
    setComputedProperties: true,
    setPublicClassFields: true,
    setSpreadProperties: true,
    skipForOfIteratorClosing: true,
    superIsCallableConstructor: true,
  },
  presets: isTest
    ? [
        [
          '@babel/preset-env',
          {
            modules: 'commonjs',
            targets: { node: 'current' },
            exclude: ['transform-typeof-symbol'],
          },
        ],
        '@babel/preset-typescript',
      ]
    : [
        [
          '@babel/preset-env',
          {
            modules: false,
            exclude: ['transform-typeof-symbol'],
          },
        ],
        '@babel/preset-typescript',
      ],
  plugins: isTest ? testPlugins : buildPlugins,
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
          'babel-plugin-jsx-remove-data-test-id',
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
      // Only apply @babel/preset-react to JSX-capable files (.tsx, .jsx, .js)
      // This prevents angle-bracket type assertions in .ts files from being
      // parsed as JSX elements.
      test: /\.(tsx|jsx|js)$/,
      presets: [
        [
          '@babel/preset-react',
          {
            development: process.env.BABEL_ENV === 'development',
            runtime: 'automatic',
          },
        ],
      ],
    },
  ],
};
