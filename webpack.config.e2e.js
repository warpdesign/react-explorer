const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');
const gitHash = require('./scripts/hash');
const platform = require('process').platform;
const release = require('os').release();

const baseConfig = {
    output: {
        path: path.resolve(__dirname, 'build-e2e'),
        filename: '[name].js'
    },
    externals: {
        "os": `{release: function() { return "${release}"}, tmpdir: function() { return "/tmpdir" }, homedir: function() { return "/homedir" }}`,
        "process": `{process: "foo", platform: "${platform}"}`,
        "electron": '{ipcRenderer: {send: function() {}, on: function() {}}, remote: { Menu: { buildFromTemplate: function() { return { popup: function() {}, closePopup: function() { } };}},app: { getLocale: function() { return "en"; }, getPath: function(str) { return "cy_" + str; } } } }',
        "child_process": '{exec: function(str, cb) { cb(); }}',
        "fs": '{}',
        "path": '{}',
        "net": '{}',
        "tls": '{}'
    },
    node: {
        __dirname: false
    },
    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",
    mode: "development",
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json", ".css"]
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

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
            target: 'web',
            entry: { gui: './src/gui/index.tsx' },
            plugins: [
                new HtmlWebpackPlugin({
                    title: 'React-Explorer',
                    template: 'index.html'
                }),
                new webpack.DefinePlugin({
                    'ENV.CY': true,
                    'ENV.NODE_ENV': JSON.stringify(baseConfig.mode),
                    'ENV.VERSION': JSON.stringify(packageJson.version),
                    'ENV.HASH': JSON.stringify(gitHash)
                }),
                new CopyPlugin([
                    {
                        from: 'img/icon-512x512.png',
                        to: 'icon.png'
                    }
                ])
            ]
        },
        baseConfig)
];
