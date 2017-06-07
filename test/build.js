'use strict';

process.chdir(`${__dirname}/addons-napi`);

const { promisify } = require('util');
const fs = require('fs');
const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const lstat = promisify(fs.lstat);
const exec = promisify(require('child_process').exec);
const mkdirp = promisify(require('mkdirp'));

const emccParams = [
    `--js-library ${require.resolve('../index.dist.js')}`,
    `-I ${__dirname}`,
    `-s EXPORT_FUNCTION_TABLES=1`,
    `-s DEMANGLE_SUPPORT=1`,
].join(' ');

let totalCount = 0;
let finishedCount = 0;

(async () => {
    let dirs = await readDir('.');

    await Promise.all(dirs.map(async dir => {
        if (dir.startsWith('.')) return;
        if (!(await lstat(dir)).isDirectory()) return;

        let gypText = await readFile(`${dir}/binding.gyp`, 'utf-8');

        // not really JSON, but most of them can be parsed with one little trick...
        gypText = gypText.replace(/'/g, '"');

        let gyp = JSON.parse(gypText);

        let bindingDir = `${dir}/build/debug`;

        await mkdirp(bindingDir);

        await Promise.all(gyp.targets.map(async target => {
            let sources = target.sources.map(name => `${dir}/${name}`);
            let dest = `${bindingDir}/${target.target_name}.js`;

            let myIndex = totalCount++;
            let shortCmd = `emcc ${sources.join(' ')} -o ${dest}`;
            let cmd = `${shortCmd} ${emccParams}`;
            console.log(`[#${myIndex}] Running: ${shortCmd}`);
            let { stderr } = await exec(cmd);
            console.log(`[#${myIndex}] [${++finishedCount}/${totalCount}] Done: ${shortCmd}`);
            console.warn(stderr);
        }));
    }));
})();
