const path = require('path');

module.exports = {
    entry: './src/index.tsx',
    devtool: 'inline-source-map',
    watch: true,
    devServer: {
        port: 3000,
        contentBase: path.join(__dirname, 'public')
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.svg$/,
                loader: 'svg-inline-loader'
            },
            {
                test: /\.html$/,
                use: [
                    {
                        loader: "html-loader"
                    }
                ]
            }
        ],
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js', '.css' ],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
};