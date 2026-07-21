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
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'cypress';

const path = require('path');
const webpack = require('webpack');

const { verifyDownloadTasks } = require('cy-verify-downloads');
const webpackPreprocessor = require('@cypress/webpack-preprocessor');

export default defineConfig({
  chromeWebSecurity: false,
  defaultCommandTimeout: 8000,
  numTestsKeptInMemory: 3,
  // Disabled after realizing this MESSES UP rison encoding in intricate ways
  experimentalFetchPolyfill: false,
  experimentalMemoryManagement: true,
  requestTimeout: 10000,
  video: false,
  viewportWidth: 1280,
  viewportHeight: 1024,
  projectId: 'ud5x2f',
  retries: {
    runMode: 2,
    openMode: 0,
  },
  e2e: {
    // Preserve cookies/localStorage between tests within a spec so the single
    // login performed in the `before` hook keeps the session authenticated.
    // Replaces the removed `Cypress.Cookies.defaults({ preserve: 'session' })`.
    testIsolation: false,
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      // ECONNRESET on Chrome/Chromium 117.0.5851.0 when using Cypress <12.15.0
      // Check https://github.com/cypress-io/cypress/issues/27804 for context
      // TODO: This workaround should be removed when upgrading Cypress
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          // eslint-disable-next-line no-param-reassign
          launchOptions.args = launchOptions.args.map(arg => {
            if (arg === '--headless') {
              return '--headless=new';
            }

            return arg;
          });

          launchOptions.args.push(
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-sandbox',
            '--disable-software-rasterizer',
            '--memory-pressure-off',
            '--js-flags=--max-old-space-size=4096',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          );
        }
        return launchOptions;
      });

      // Compile specs with a project-local webpack + Babel preprocessor.
      // Cypress' bundled TypeScript preprocessor ships an unresolvable
      // @babel/preset-typescript, which breaks spec compilation, so we
      // transpile with our own Babel presets from this project's node_modules.
      on(
        'file:preprocessor',
        webpackPreprocessor({
          webpackOptions: {
            resolve: {
              extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
              // Mirror the tsconfig `baseUrl: "."` so specs can import
              // project-root paths like `cypress/utils/urls`.
              modules: [path.resolve(__dirname), 'node_modules'],
              // Node core polyfills, matching Cypress' bundled preprocessor.
              fallback: {
                buffer: require.resolve('buffer/'),
                os: require.resolve('os-browserify/browser'),
                path: require.resolve('path-browserify'),
                process: require.resolve('process/browser.js'),
                stream: require.resolve('stream-browserify'),
                assert: false,
                child_process: false,
                constants: false,
                crypto: false,
                events: false,
                fs: false,
                http: false,
                https: false,
                net: false,
                querystring: false,
                tls: false,
                tty: false,
                url: false,
                util: false,
                vm: false,
                zlib: false,
              },
            },
            plugins: [
              new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: require.resolve('process/browser.js'),
              }),
            ],
            module: {
              rules: [
                {
                  test: /\.[cm]?[jt]sx?$/,
                  exclude: [/node_modules/],
                  use: [
                    {
                      loader: 'babel-loader',
                      options: {
                        presets: [
                          ['@babel/preset-env', { targets: { chrome: '64' } }],
                          ['@babel/preset-react', { runtime: 'automatic' }],
                          '@babel/preset-typescript',
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          },
        }),
      );

      // eslint-disable-next-line global-require
      require('@cypress/code-coverage/task')(on, config);
      on('task', verifyDownloadTasks);
      // eslint-disable-next-line global-require,import/extensions
      return config;
    },
    baseUrl: 'http://localhost:8088',
    excludeSpecPattern: ['**/_skip.*'],
    experimentalRunAllSpecs: true,
    specPattern: ['cypress/e2e/**/*.{js,jsx,ts,tsx}'],
  },
});
