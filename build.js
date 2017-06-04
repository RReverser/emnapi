require('rollup-emscripten').default({
    entry: __dirname + '/index.js',
    localPrefix: 'napi'
})
.then(result => result.write(__dirname + '/index.dist.js'))
.catch(console.error);
