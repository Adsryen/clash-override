const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { minify } = require('../generator/node_modules/terser')

const rootDirectory = path.resolve(__dirname, '..')
const readablePath = path.join(rootDirectory, 'global_script.js')
const minifiedPath = path.join(rootDirectory, 'global_script.min.js')

async function run() {
    const readableSource = fs.readFileSync(readablePath, 'utf8')
    const minifiedSource = fs.readFileSync(minifiedPath, 'utf8')
    const expected = await minify(readableSource, {
        compress: true,
        mangle: true,
        format: { comments: /@clash-override-generator/ },
    })

    assert.equal(minifiedSource, expected.code)
    assert.ok(minifiedSource.length < readableSource.length)
    assert.match(minifiedSource, /@clash-override-generator/)

    const main = new Function(`${minifiedSource}\nreturn main`)()
    const result = main({
        proxies: [{ name: 'Hong Kong 01' }],
        'proxy-groups': [],
        rules: [],
    })

    assert.ok(Array.isArray(result.rules))
    assert.ok(Array.isArray(result['proxy-groups']))
    console.log('Minified script checks passed')
}

run().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
