const { InjectManifest } = require('workbox-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackInjector = require('html-webpack-injector')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const path = require('path')

module.exports = (env, args) => {
	const plugins = [
		new CopyPlugin({
			patterns: [{
				from: '**/*',
				to: '[path][name][ext]',
				context: 'public/',
				globOptions: {
					ignore: [
						'**/index.html'
					]
				}
			}],
		}),
		new MiniCssExtractPlugin({
			filename: 'css/[name].[contenthash].css'
		}),
		new HtmlWebpackPlugin({
			template: './public/index.html',
			filename: 'index.html',
			scriptLoading: 'module',
			chunks: ['main'],
			chunksConfig: {
				async: ['main']
			},
			minify: {
				collapseWhitespace: true,
				collapseInlineTagWhitespace: true,
				keepClosingSlash: true,
				removeComments: true,
				removeRedundantAttributes: true,
				removeScriptTypeAttributes: true,
				removeStyleLinkTypeAttributes: true,
				useShortDoctype: true,
				minifyCSS: true,
				minifyJS: true
			}
		}),
		new HtmlWebpackInjector()
	]
	if (args.mode == 'production') {
		plugins.push(new InjectManifest({
			maximumFileSizeToCacheInBytes: 30000000,
			swSrc: './src/service-worker.js',
			exclude: [
				/.*\.json$/gi,
				/\.nojekyll/gi,
				/robots\.txt/gi,
				/CNAME/gi
			]
		}))
	}
	return {
		mode: args.mode,
		entry: './src/main.js',
		experiments: {
			outputModule: true,
		},
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'js/[name].[contenthash].js',
			module: true,
			clean: true
		},
		plugins: plugins,
		module: {
			rules: [
				{
					test: /\.s?css$/i,
					use: [
						{
							loader: MiniCssExtractPlugin.loader
						},
						{
							loader: 'css-loader',
							options: {
								url: false
							}
						},
						'sass-loader'
					]
				}
			]
		},
		optimization: {
			splitChunks: {
				chunks: 'all',
				maxSize: 200000
			},
			minimizer: [
				new TerserPlugin({
					parallel: true,
					extractComments: false,
					terserOptions: {
						format: {
							comments: false
						}
					}
				})
			]
		},
		devServer: {
			port: 8090,
			headers: {
				'Content-Encoding': 'none',
				'X-Content-Type-Options': 'nosniff'
			},
			static: {
				directory: path.resolve(__dirname, 'public')
			},
			/* https: {
				key: path.resolve(__dirname, 'cert', 'dev.key'),
				cert: path.resolve(__dirname, 'cert', 'dev.cert')
			} */
		},
		performance: {
			hints: false
		}
	}
}