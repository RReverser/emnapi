'use strict';

process.chdir(`${__dirname}/js-native-api`);

const { promisify } = require('util');
const fs = require('fs');
const mkdir = promisify(fs.mkdir);
const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const lstat = promisify(fs.lstat);
const { spawn } = require('child_process');
const PQueue = require('p-queue');

const emcc = require('which').sync('emcc');

const emccParams = [
	'--js-library',
	require.resolve('../index.dist.js'),
	'-I',
	__dirname,
	'-O2',
	'-g4',
	'-s',
	'DEMANGLE_SUPPORT=1',
	'-s',
	'ASSERTIONS=2',
	'-s',
	'SAFE_HEAP=1',
	'-s',
	'BINARYEN_ASYNC_COMPILATION=0',
];

(async () => {
	let pQueue = new PQueue({ concurrency: 4, autoStart: false });
	let total = 0;
	let succeeded = 0;

	for (let dir of await readDir('.')) {
		if (dir.startsWith('.')) continue;
		if (!(await lstat(dir)).isDirectory()) continue;

		let gypText = await readFile(`${dir}/binding.gyp`, 'utf-8');

		// not really JSON, but most of them can be parsed with one little trick...
		gypText = gypText.replace(/'/g, '"');

		let gyp = JSON.parse(gypText);

		let bindingDir = `${dir}/build/debug`;

		await mkdir(bindingDir, { recursive: true });

		for (let target of gyp.targets) {
			let myIndex = total++;

			pQueue.add(async () => {
				let sources = target.sources.map(name => `${dir}/${name}`);
				let dest = `${bindingDir}/${target.target_name}.js`;

				let shortCmd = `emcc ${sources.join(' ')} -o ${dest}`;
				console.log(`[#${myIndex} / ${total}] Running: ${shortCmd}`);
				let status = await new Promise(resolve => {
					let process = spawn(emcc, [...emccParams, ...sources, '-o', dest], {
						stdio: 'inherit',
					});
					process.once('exit', code => {
						if (code === 0) {
							succeeded++;
							resolve('OK');
						} else {
							resolve(`Exit code ${code}`);
						}
					});
				});
				console.log(`[#${myIndex} / ${total}] Done: ${shortCmd} (${status})`);
			});
		}
	}

	pQueue.start();

	await pQueue.onIdle();

	console.log(`Successfully built ${succeeded} / ${total} targets.`);
})().catch(err => {
	console.error(err);
	process.exit(1);
});
