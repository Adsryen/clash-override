const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const script = fs.readFileSync(
    path.join(__dirname, '..', 'global_script.js'),
    'utf8',
)
const main = new Function(`${script}\nreturn main`)()

const result = main({
    proxies: [
        { name: 'HK香港 Test', type: 'ss' },
        { name: 'JP日本 Test', type: 'ss' },
        { name: 'US美国 Test', type: 'ss' },
    ],
})

const githubRule = 'GEOSITE,github,Github'
const microsoftCnRule = 'GEOSITE,microsoft@cn,国内网站'
const microsoftRule = 'GEOSITE,microsoft,微软服务'
const githubIndex = result.rules.indexOf(githubRule)
const microsoftCnIndex = result.rules.indexOf(microsoftCnRule)
const microsoftIndex = result.rules.indexOf(microsoftRule)

assert.ok(githubIndex >= 0, 'GitHub rule should be generated')
assert.ok(githubIndex < microsoftCnIndex, 'GitHub rule must precede Microsoft CN rule')
assert.ok(githubIndex < microsoftIndex, 'GitHub rule must precede Microsoft rule')
assert.ok(
    result['proxy-groups'].some((group) => group.name === 'Github'),
    'Github group should be generated',
)
assert.ok(
    result['proxy-groups'].some((group) => group.name === '微软服务'),
    'Microsoft group should be generated',
)

console.log('Rule priority checks passed')
