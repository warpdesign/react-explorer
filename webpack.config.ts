import webpack from 'webpack'
import { resolve as _resolve, join } from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'
import { DefinePlugin } from 'webpack'
import { version } from './package.json'
import gitHash from './scripts/hash'

const buildDate = Date.now()

const baseConfig: webpack.Configuration = {
    output: {
        path: _resolve(__dirname, 'build'),
    },
    node: {
        __dirname: false,
    },
    devtool: 'source-map',
    mode: 'development',
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json', '.css'],
        alias: {
            $src: _resolve(__dirname, 'src'),
        },
    },
    resolveLoader: {
        alias: {
            'data-cy-loader': join(__dirname, 'scripts/data-cy-loader.js'),
        },
    },
    module: {
        rules: [
            {
                test: /\.worker\.ts$/,
                use: { loader: 'worker-loader' },
            },
            {
                test: /\.tsx?$/,
                exclude: /(node_modules)/,
                resolve: {
                    fullySpecified: false,
                },
                use: [
                    {
                        loader: 'swc-loader',
                    },
                    {
                        loader: 'data-cy-loader',
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

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    // externals: {
    //     "react": "React",
    //     "react-dom": "ReactDOM"
    // }
}

export default [
    Object.assign(
        {
            target: 'electron-main',
            entry: { main: './src/electron/main.ts' },
            externals: {
                sqlite3: 'commonjs sqlite3',
            },
            plugins: [
                new ForkTsCheckerWebpackPlugin(),
                new DefinePlugin({
                    'window.ENV.CY': false,
                    'window.ENV.NODE_ENV': JSON.stringify(baseConfig.mode),
                    'window.ENV.VERSION': JSON.stringify(version),
                    'window.ENV.HASH': JSON.stringify(gitHash),
                    'window.ENV.BUILD_DATE': JSON.stringify(buildDate),
                }),
            ],
        },
        baseConfig,
    ),
    Object.assign(
        {
            target: 'electron-renderer',
            entry: { gui: './src/gui/index.tsx' },
            externals: {
                sqlite3: 'commonjs sqlite3',
            },
            plugins: [
                new ForkTsCheckerWebpackPlugin(),
                new HtmlWebpackPlugin({
                    title: 'React-Explorer',
                    template: 'index.html',
                }),
                new DefinePlugin({
                    'window.ENV.CY': false,
                    'window.ENV.NODE_ENV': JSON.stringify(baseConfig.mode),
                    'window.ENV.VERSION': JSON.stringify(version),
                    'window.ENV.HASH': JSON.stringify(gitHash),
                    'window.ENV.BUILD_DATE': JSON.stringify(buildDate),
                }),
                new CopyPlugin({
                    patterns: [
                        {
                            from: 'img/icon-512x512.png',
                            to: 'icon.png',
                        },
                    ],
                }),
            ],
        },
        baseConfig,
    ),
]
