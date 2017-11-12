'use strict';

const mustCall = require('must-call');

require('source-map-support').install();

module.exports = {
	buildType: 'debug',

	mustCall(fn = () => {}, expected = 1) {
		return mustCall(fn, expected);
	},

	expectsError({ code, message }) {
		return err => err.code === code && err.message === message;
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
