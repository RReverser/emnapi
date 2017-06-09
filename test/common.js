'use strict';

const mustCall = require('must-call');

require('source-map-support').install();

module.exports = {
	buildType: 'debug',

	mustCall(fn = () => {}, expected = 1) {
		mustCall(fn, expected);
	},
};

if (process.send) {
	process.on('uncaughtException', err => {
		if (typeof err === 'string') {
			// Emscripten throws strings :(
			process.send(err.replace(/at[^]*abort.*$/m, ''));
		} else {
			process.send(err.stack);
		}
	});
}
