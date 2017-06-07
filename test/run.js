'use strict';

process.chdir(`${__dirname}/addons-napi`);

const tap = require('tap');
const { promisify } = require('util');
const fs = require('fs');
const readDir = promisify(fs.readdir);
const lstat = promisify(fs.lstat);

require('source-map-support').install();

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
            try {
                require(`./addons-napi/${test}`);
            } catch (e) {
                let err = e;
                if (typeof err === 'string') {
                    err = new Error();
                    err.stack = e;
                }
                throw err;
            }
            t.end();
        });
    }
})().catch(err => {
    console.error(err);
    process.exit(1);
});
