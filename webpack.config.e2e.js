const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const baseConfig = {
    output: {
        path: path.resolve(__dirname, 'dist-e2e'),
        filename: '[name].js'
    },
    externals: {
        "process": '{process: "dtc"}',
        "electron": '{ipcRenderer: {send: function() {}, on: function() {}}, remote: { app: { getPath: function(str) { return "**ci**"; } } } }',
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
            entry: { gui: './src/index.tsx' },
            plugins: [
                new HtmlWebpackPlugin({
                    title: 'React-FTP',
                    template: 'index.html'
                }),
                new webpack.DefinePlugin({
                    'ENV.CY': true,
                    'ENV.NODE_ENV': JSON.stringify(baseConfig.mode)
                })]
        },
        baseConfig)
];
