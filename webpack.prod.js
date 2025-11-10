const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = merge(common, {
	mode: 'production',
	output: {
		path: path.resolve(__dirname, 'docs'),
		filename: 'app.bundle.[contenthash].js',
		publicPath: '/',
	},
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new MiniCssExtractPlugin({ filename: 'app.[contenthash].css' }),
		// copy static public files into docs for production (manifest, service-worker, icons, etc.)
		new CopyWebpackPlugin({
			patterns: [
				{ from: path.resolve(__dirname, 'src/public'), to: path.resolve(__dirname, 'docs') },
			],
		}),
	],
});
