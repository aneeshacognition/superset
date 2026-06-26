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

// Babel 8 removed NodePath.prototype.hoist, which @emotion/babel-plugin still
// calls.  Polyfill it as a no-op so the plugin runs without error.
// Must patch the @babel/traverse resolved from @babel/core (Babel 8's copy).
try {
  const traversePath = require.resolve('@babel/traverse', {
    paths: [require.resolve('@babel/core')],
  });
  const { NodePath } = require(traversePath);
  if (NodePath && !NodePath.prototype.hoist) {
    NodePath.prototype.hoist = function () {};
  }
} catch {
  // @babel/traverse not resolvable – nothing to patch
}

module.exports = {
  sourceMaps: true,
  sourceType: 'module',
  retainLines: true,
  assumptions: {
    iterableIsArray: true,
    mutableTemplateObject: true,
    noClassCalls: true,
    noDocumentAll: true,
    noNewArrows: true,
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
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false,
        shippedProposals: true,
        targets: packageConfig.browserslist,
      },
    ],
    ['@babel/preset-typescript', { onlyRemoveTypeImports: false }],
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    [
      'babel-plugin-polyfill-corejs3',
      { method: 'usage-global', version: '3.43' },
    ],
    [
      '@emotion/babel-plugin',
      {
        autoLabel: 'dev-only',
        labelFormat: '[local]',
      },
    ],
    // @emotion/babel-plugin adds the jsx parser plugin before preset-typescript
    // adds typescript, so for plain .ts files jsx leaks in and the Babel 8
    // parser chokes on TypeScript generics like <T extends unknown>().
    // Strip jsx for .ts-only files; .tsx/.jsx/.js keep it.
    function stripJsxForTsFiles() {
      return {
        name: 'strip-jsx-for-ts-files',
        manipulateOptions(opts, parserOpts) {
          const f = opts.filename || '';
          if (
            f.endsWith('.ts') &&
            !f.endsWith('.d.ts') &&
            !f.endsWith('.tsx')
          ) {
            parserOpts.plugins = parserOpts.plugins.filter(
              p => (Array.isArray(p) ? p[0] : p) !== 'jsx',
            );
          }
        },
      };
    },
  ],
  env: {
    // Setup a different config for tests as they run in node instead of a browser
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            shippedProposals: true,
            modules: 'auto',
            targets: { node: 'current' },
          },
        ],
        ['@babel/preset-typescript', { onlyRemoveTypeImports: false }],
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
      // Apply preset-react only to files that can contain JSX (.jsx, .tsx, .js)
      // but NOT to plain .ts files, where Babel 8's JSX parser plugin would
      // conflict with TypeScript generic syntax (e.g. <T = unknown>() => ...).
      test: filename =>
        !filename || !filename.endsWith('.ts') || filename.endsWith('.tsx'),
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
    {
      test: './plugins/plugin-chart-handlebars/node_modules/just-handlebars-helpers/*',
      sourceType: 'unambiguous',
    },
  ],
};
