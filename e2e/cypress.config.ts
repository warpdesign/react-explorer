import { defineConfig } from 'cypress'
import webpackPreprocessor from '@cypress/webpack-preprocessor'
import { ResolveOptions } from 'webpack'
import { resolve } from 'path'

export default defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            // FIXME: this doesn't work: the exported default config doesn't
            // seem to be the one used internally by Cypress.
            // So if we use this one, this breaks TypeScript support as the
            // default config doesn't include it:
            // {
            //     mode: 'development',
            //     module: {
            //       rules: [
            //         {
            //           test: /\.jsx?$/,
            //           exclude: [/node_modules/],
            //           use: [
            //             {
            //               loader: 'babel-loader',
            //               options: {
            //                 presets: ['@babel/preset-env'],
            //               },
            //             },
            //           ],
            //         },
            //       ],
            //     },
            //   }
            // const options = webpackPreprocessor.defaultOptions.webpackOptions
            //
            // options.resolve = {
            //     alias: {
            //         $src: resolve(__dirname, '../src'),
            //     },
            // } as ResolveOptions
            //
            // See: https://github.com/cypress-io/cypress/discussions/24751
            //
            // on('file:preprocessor', webpackPreprocessor(webpackPreprocessor.defaultOptions))
        },
        specPattern: 'cypress/e2e/**/*.spec.{js,jsx,ts,tsx}',
    },
})
