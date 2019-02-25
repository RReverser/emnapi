'use strict';

process.chdir(`${__dirname}/js-native-api`);

const tap = require('tap');
const { promisify } = require('util');
const fs = require('fs');
const readDir = promisify(fs.readdir);
const lstat = promisify(fs.lstat);
const { fork } = require('child_process');

(async () => {
	for (let dir of await readDir('.')) {
		if (dir.startsWith('.')) continue;
		if (!(await lstat(dir)).isDirectory()) continue;

		for (let filename of await readDir(dir)) {
			if (/^test.*\.js$/.test(filename)) {
				tap.test(
					`${dir}/${filename}`,
					() =>
						new Promise((resolve, reject) => {
							let child = fork(filename, {
								cwd: dir,
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
									reject(new Error(`Exit code ${code}`));
								}
							});
						})
				);
			}
		}
	}
})().catch(err => {
	console.error(err);
	process.exit(1);
});
