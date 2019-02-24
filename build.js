/* eslint-env node */

require('rollup-emscripten')
	.default({
		input: __dirname + '/src/index.js',
		localPrefix: 'napi',
	})
	.then(result => result.write(__dirname + '/index.dist.js'))
	.catch(err => {
		// eslint-disable-next-line no-console
		console.error(err);
		process.exit(1);
	});
