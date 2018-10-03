const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const baseConfig = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    node: {
        __dirname: false
    },
    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",
    mode: "development",
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
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
            entry: { main: './src/main.ts' }
        },
        baseConfig),
    Object.assign(
        {
            target: 'electron-renderer',
            entry: { gui: './src/index.tsx' },
            plugins: [new HtmlWebpackPlugin({
                title: 'React-FTP',
                template: 'index.html'
            })]
        },
        baseConfig)
];