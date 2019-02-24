'use strict';

process.chdir(`${__dirname}/js-native-api`);

const tap = require('tap');
const { promisify } = require('util');
const fs = require('fs');
const readDir = promisify(fs.readdir);
const lstat = promisify(fs.lstat);
const { fork } = require('child_process');

(async () => {
	let dirs = await readDir('.');

	let tests = [];

	await Promise.all(
		dirs.map(async dir => {
			if (dir.startsWith('.')) return;
			if (!(await lstat(dir)).isDirectory()) return;

			for (let filename of await readDir(dir)) {
				if (/^test.*\.js$/.test(filename)) {
					tests.push({ dir, filename });
				}
			}
		})
	);

	for (let test of tests) {
		tap.test(
			`${test.dir}/${test.filename}`,
			() =>
				new Promise((resolve, reject) => {
					let child = fork(test.filename, {
						cwd: test.dir,
						stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
					});

					child.on('message', stack => {
						let err = new Error();
						err.stack = stack;
						reject(err);
					});

					child.once('error', reject);

					child.once('exit', code => {
						if (code === 0) {
							resolve();
						} else {
							reject(new Error('Unknown failure'));
						}
					});
				})
		);
	}
})().catch(err => {
	console.error(err);
	process.exit(1);
});
