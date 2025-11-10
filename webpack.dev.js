const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

const desiredPort = process.env.PORT ? Number(process.env.PORT) : 'auto';

module.exports = merge(common, {
	mode: 'development',
	devtool: 'eval-source-map',
	devServer: {
		static: { directory: path.resolve(__dirname, 'dist') },
		historyApiFallback: true,
		hot: true,
		port: desiredPort,
		client: { overlay: true },
		open: false,
	},
});
