import { resolve as _resolve, join } from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { DefinePlugin, ProvidePlugin } from 'webpack'
import { version } from './package.json'
import gitHash from '../scripts/hash'
import { release, arch } from 'os'
import { version as node } from 'process'
const MOCKS_PATH = './cypress/mocks/'
import { platform as PLATFORM } from 'process'
import { readdirSync } from 'fs'

function resolveMock(moduleName) {
    return _resolve(__dirname, `${MOCKS_PATH}${moduleName}.js`)
}

/**
 * Creates the alias configuration object for webpack
 *
 * For each file found in mockPath, create a new entry inside an object pointing to this file.
 *
 * Adding a new mock for the end to end build is as easy as adding a new file having the name
 * of the module to mock.
 *
 * eg.
 *
 * contents of mockPath:
 * ==
 * fs.js
 * process.js
 * ==
 *
 * returned object:
 *
 * { fs: '<full path to mockPath>/fs.js', fs: '<full path to mockPath>/process.js' }
 *
 * @param {string} mockPath path to the mocks directory
 */
function webpackAliases(mockPath) {
    const mockNames = readdirSync(mockPath).map((file) => file.replace('.js', ''))
    console.log('Generating webpack alias for mocks', mockNames)
    return mockNames.reduce((acc, name) => {
        acc[name] = resolveMock(name)
        return acc
    }, {})
}

const aliases = webpackAliases(MOCKS_PATH)

const baseConfig = {
    output: {
        path: _resolve(__dirname, 'build-e2e'),
    },
    externals: {
        // path: '{}',
        net: '{}',
        tls: '{}',
    },
    node: {
        __dirname: false,
    },
    // Enable sourcemaps for debugging webpack's output.
    devtool: 'source-map',
    mode: 'development',
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['.ts', '.tsx', '.js', '.json', '.css'],
        alias: {
            fs: 'memfs',
            $src: _resolve(__dirname, '../src'),
            // TODO: use proper polyfills instead of incomplete custom ones
            ...aliases,
        },
        fallback: {
            // needed for rimraf
            fs: require.resolve('fs'),
            stream: require.resolve('stream-browserify'),
            assert: require.resolve('assert/'),
            util: require.resolve('util/'),
            path: require.resolve('path-browserify'),
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                resolve: {
                    fullySpecified: false,
                },
                use: [
                    {
                        loader: 'swc-loader',
                    },
                ],
            },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader', exclude: /electron-devtools-installer/ },
            // css loader
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            // file loader, for loading files referenced inside css files
            {
                test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[hash][ext][query]',
                },
            },
            // images embbeded into css
            {
                test: /\.(png|jpg|gif)$/i,
                type: 'asset/inline',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8192,
                    },
                },
            },
        ],
    },
}

export default [
    Object.assign(
        {
            target: 'web',
            entry: { gui: '../src/gui/index.tsx' },
            plugins: [
                new HtmlWebpackPlugin({
                    title: 'React-Explorer',
                    template: '../index.html',
                }),
                new DefinePlugin({
                    'window.ENV.CY': true,
                    'window.ENV.NODE_ENV': JSON.stringify(baseConfig.mode),
                    'window.ENV.VERSION': JSON.stringify(version),
                    'window.ENV.HASH': JSON.stringify(gitHash),
                    'window.ENV.BUILD_DATE': JSON.stringify(Date.now()),
                    __RELEASE__: JSON.stringify(release()),
                    __PLATFORM__: JSON.stringify(PLATFORM),
                    __ARCH__: JSON.stringify(arch()),
                    __NODE__: JSON.stringify(node),
                }),
                new ProvidePlugin({
                    // some code don't import process and access it directly
                    // so we have to provide the module as having the alias
                    // won't work in this case (fs.realpath for example)
                    process: (aliases as any).process,
                }),
            ],
        },
        baseConfig,
    ),
]
