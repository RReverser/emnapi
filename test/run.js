'use strict';

process.chdir(`${__dirname}/addons-napi`);

const tap = require('tap');
const { promisify } = require('util');
const fs = require('fs');
const readDir = promisify(fs.readdir);
const lstat = promisify(fs.lstat);

(async () => {
    let dirs = await readDir('.');

    let tests = [];

    await Promise.all(dirs.map(async dir => {
        if (dir.startsWith('.')) return;
        if (!(await lstat(dir)).isDirectory()) return;

        for (let filename of await readDir(dir)) {
            if (/^test.*\.js$/.test(filename)) {
                tests.push(`${dir}/${filename}`);
            }
        }
    }));

    for (let test of tests) {
        tap.test(test, t => {
            require(`./addons-napi/${test}`);
            t.end();
        });
    }
})();
