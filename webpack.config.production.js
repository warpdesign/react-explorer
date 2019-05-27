const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');
const gitHash = require('./scripts/hash');

console.log(packageJson.version);

const baseConfig = {
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js'
    },
    node: {
        __dirname: false
    },
    mode: "production",
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json", ".css"]
    },
    resolveLoader: {
        alias: {
            'data-cy-loader': path.join(__dirname, 'scripts/data-cy-loader.js')
        }
    },
    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /\.tsx?$/, use: ["awesome-typescript-loader", "data-cy-loader"] },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
            // css loader
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            // file loader, for loading files referenced inside css files
            {
                test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'fonts/'
                    }
                }]
            },
            // images embbeded into css
            {
                test: /\.(png|jpg|gif)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192
                        }
                    }
                ]
            }
        ]
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    // externals: {
    //     "react": "React",
    //     "react-dom": "ReactDOM"
    // }
};

module.exports = [
    Object.assign(
        {
            target: 'electron-main',
            entry: { main: './src/electron/main.ts' },
            plugins: [
                new webpack.DefinePlugin({
                    'ENV.CY': false,
                    'ENV.NODE_ENV': JSON.stringify(baseConfig.mode),
                    'ENV.VERSION': JSON.stringify(packageJson.version),
                    'ENV.HASH': JSON.stringify(gitHash)
                })
            ]
        },
        baseConfig),
    Object.assign(
        {
            target: 'electron-renderer',
            entry: { gui: './src/gui/index.tsx' },
            plugins: [
                new HtmlWebpackPlugin({
                    title: 'React-Explorer',
                    template: 'index.html'
                }),
                new webpack.DefinePlugin({
                    'ENV.CY': false,
                    'ENV.NODE_ENV': JSON.stringify(baseConfig.mode),
                    'ENV.VERSION': JSON.stringify(packageJson.version),
                    'ENV.HASH': JSON.stringify(gitHash)
                }),
                new CopyPlugin([
                    {
                        from: 'img/icon.icns',
                        to: 'icon.icns'
                    },
                    {
                        from: 'img/icon-512x512.png',
                        to: 'icon.png'
                    },
                    {
                        from: 'img/icon-512x512.ico',
                        to: 'icon.ico'
                    }
                ])
            ]
        },
        baseConfig)
];
