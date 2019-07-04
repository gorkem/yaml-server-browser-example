/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
const path = require('path');
const lib = path.resolve(__dirname, "lib");

const webpack = require('webpack');
const merge = require('webpack-merge');

const common = {
    entry: {
        "main": path.resolve(lib, "main.js"),
        "editor.worker": 'monaco-editor-core/esm/vs/editor/editor.worker.js'
    },
    output: {
        filename: '[name].bundle.js',
        path: lib,
        globalObject: 'this'
    },
    module: {
        rules: [{
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }]
    },
    target: 'web',
    node: {
        fs: 'empty',
        child_process: 'empty',
        net: 'empty',
        crypto: 'empty',
        module: 'empty'
    },
    devtool: "source-map"
};

if (process.env['NODE_ENV'] === 'production') {
    module.exports = merge(common, {
        plugins: [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify('production')
            }),
            new webpack.ContextReplacementPlugin(
                /vscode*/,
                path.join(__dirname, './client')
            )
        ]
    });
} else {
    module.exports = merge(common, {
        plugins: [
            new webpack.ContextReplacementPlugin(
                /vscode*/,
                path.join(__dirname, './client')
            )
        ]
    });
}
