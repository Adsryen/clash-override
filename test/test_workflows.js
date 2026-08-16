const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml')

const rootDirectory = path.resolve(__dirname, '..')

function readWorkflow(name) {
    const source = fs.readFileSync(
        path.join(rootDirectory, '.github', 'workflows', name),
        'utf8',
    )
    return { source, workflow: yaml.load(source) }
}

const { source: ciSource, workflow: ciWorkflow } = readWorkflow('ci-pages.yml')
const { source: releaseSource, workflow: releaseWorkflow } = readWorkflow('release.yml')
const generatorPackage = JSON.parse(
    fs.readFileSync(path.join(rootDirectory, 'generator', 'package.json'), 'utf8'),
)

assert.deepEqual(ciWorkflow.on.push.branches, ['main'])
assert.deepEqual(ciWorkflow.on.pull_request.branches, ['main'])
assert.ok(ciWorkflow.jobs.verify)
assert.ok(ciWorkflow.jobs.deploy)
assert.equal(ciWorkflow.jobs.deploy.needs, 'verify')
assert.match(ciSource, /actions\/checkout@v5/)
assert.match(ciSource, /actions\/setup-node@v5/)
assert.match(ciSource, /actions\/configure-pages@v6/)
assert.match(ciSource, /enablement: true/)
assert.match(ciSource, /actions\/deploy-pages@v5/)
assert.match(ciSource, /actions\/upload-pages-artifact@v5/)
assert.match(ciSource, /pages: write/)
assert.match(ciSource, /--base=\/\$\{\{ github\.event\.repository\.name \}\}\//)
assert.match(ciSource, /npx playwright install --with-deps chromium/)
assert.match(ciSource, /npm run test:e2e/)
assert.match(ciSource, /node --check global_script\.min\.js/)
assert.match(ciSource, /npm run test:min-script/)

assert.deepEqual(releaseWorkflow.on.push.tags, ['v*'])
assert.ok(releaseWorkflow.jobs.release)
assert.match(releaseSource, /actions\/checkout@v5/)
assert.match(releaseSource, /actions\/setup-node@v5/)
assert.match(releaseSource, /node --check \.\.\/global_script\.js/)
assert.match(
    releaseSource,
    /gh release create "\$GITHUB_REF_NAME" "global_script\.js#全局覆写脚本" "global_script\.min\.js#压缩版全局覆写脚本"/,
)
assert.match(releaseSource, /node --check \.\.\/global_script\.min\.js/)
assert.match(releaseSource, /npm run test:min-script/)
assert.match(releaseSource, /gh release create/)
assert.match(releaseSource, /contents: write/)

assert.equal(generatorPackage.scripts['build:offline'], undefined)
assert.equal(generatorPackage.scripts['test:e2e'], 'playwright test')

console.log('GitHub workflow checks passed')
