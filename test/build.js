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
	'--memory-init-file',
	'0',
	'-g4',
	'-s',
	'DEMANGLE_SUPPORT=1',
	'-s',
	'ASSERTIONS=2',
	'-s',
	'SAFE_HEAP=1',
	'-s',
	'ALIASING_FUNCTION_POINTERS=0',
];

(async () => {
	let pQueue = new PQueue({ concurrency: 4, autoStart: false });

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
			let myIndex = pQueue.size;

			pQueue.add(async () => {
				let sources = target.sources.map(name => `${dir}/${name}`);
				let dest = `${bindingDir}/${target.target_name}.js`;

				let shortCmd = `emcc ${sources.join(' ')} -o ${dest}`;
				console.log(`[#${myIndex}] Running: ${shortCmd}`);
				let status = await new Promise((resolve, reject) => {
					let process = spawn(emcc, [...emccParams, ...sources, '-o', dest], {
						stdio: ['ignore', 'inherit', 'inherit'],
					});
					process.once('error', reject);
					process.once('exit', code =>
						code === 0 ? resolve() : reject(new Error(`Exit code ${code}`))
					);
				}).then(() => 'OK', err => err.stack);
				console.log(
					`[#${myIndex}] [${pQueue.pending}/${
						pQueue.size
					}] Done: ${shortCmd} (${status})`
				);
			});
		}
	}

	pQueue.start();

	await pQueue.onEmpty;
})().catch(err => {
	console.error(err);
	process.exit(1);
});
