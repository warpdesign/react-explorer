import { resolve as _resolve } from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import { DefinePlugin } from 'webpack';
import { version } from './package.json';
import gitHash from '../scripts/hash';
import { release } from 'os';
const MOCKS_PATH = 'cypress/mocks/';
const RELEASE = release();
import { platform as PLATFORM } from 'process';
import { readdirSync } from 'fs';

function resolveMock(moduleName) {
    return _resolve(__dirname, `${MOCKS_PATH}${moduleName}.js`);
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
    const mockNames = readdirSync(mockPath).map((file) => file.replace('.js', ''));
    console.log('Generating webpack alias for mocks', mockNames);
    return mockNames.reduce((acc, name) => {
        acc[name] = resolveMock(name);
        return acc;
    }, {});
}

const baseConfig = {
    output: {
        path: _resolve(__dirname, 'build-e2e'),
        filename: '[name].js',
    },
    externals: {
        path: '{}',
        net: '{}',
        tls: '{}',
        fs: '{}',
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
        alias: webpackAliases(MOCKS_PATH),
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            // disable type checker - we will use it in fork plugin
                            transpileOnly: true,
                            configFile: _resolve('./build-tsconfig.json'),
                        },
                    },
                ],
            },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' },
            // css loader
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            // file loader, for loading files referenced inside css files
            {
                test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[name].[ext]',
                            outputPath: 'fonts/',
                        },
                    },
                ],
            },
            // images embbeded into css
            {
                test: /\.(png|jpg|gif)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                        },
                    },
                ],
            },
        ],
    },
};

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
                    'ENV.CY': true,
                    'ENV.NODE_ENV': JSON.stringify(baseConfig.mode),
                    'ENV.VERSION': JSON.stringify(version),
                    'ENV.HASH': JSON.stringify(gitHash),
                    __RELEASE__: JSON.stringify(RELEASE),
                    __PLATFORM__: JSON.stringify(PLATFORM),
                }),
                new CopyPlugin({
                    patterns: [
                        {
                            from: '../img/icon-512x512.png',
                            to: 'icon.png',
                        },
                    ],
                }),
            ],
        },
        baseConfig,
    ),
];
