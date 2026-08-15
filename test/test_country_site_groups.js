const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function loadMain(russia) {
    const script = fs
        .readFileSync(path.join(__dirname, '..', 'global_script.js'), 'utf8')
        .replace(
            '    russia: true, // 俄罗斯网站策略组',
            `    russia: ${russia}, // 俄罗斯网站策略组`,
        )

    return new Function(`${script}\nreturn main`)()
}

function createConfig() {
    return {
        proxies: [
            { name: 'HK香港 Test', type: 'ss' },
            { name: 'JP日本 Test', type: 'ss' },
            { name: 'US美国 Test', type: 'ss' },
        ],
    }
}

function findGroup(config, name) {
    const group = config['proxy-groups'].find((item) => item.name === name)
    assert.ok(group, `${name} group should be generated`)
    return group
}

const enabledResult = loadMain(true)(createConfig())
const russiaGroup = findGroup(enabledResult, '俄罗斯网站')

assert.equal(russiaGroup.proxies[0], '直连')
assert.ok(enabledResult.rules.includes('RULE-SET,category-ru,俄罗斯网站'))
assert.ok(enabledResult.rules.includes('GEOIP,RU,俄罗斯网站,no-resolve'))
assert.ok(enabledResult['rule-providers']['category-ru'])
assert.deepEqual(findGroup(enabledResult, '日本网站').proxies.slice(0, 2), ['JP日本', '默认节点'])
assert.deepEqual(findGroup(enabledResult, '香港网站').proxies.slice(0, 2), ['HK香港', '默认节点'])
assert.deepEqual(findGroup(enabledResult, '美国网站').proxies.slice(0, 2), ['US美国', '默认节点'])

const disabledResult = loadMain(false)(createConfig())

assert.equal(disabledResult['proxy-groups'].some((group) => group.name === '俄罗斯网站'), false)
assert.equal(disabledResult.rules.some((rule) => rule.includes('俄罗斯网站')), false)
assert.equal(Boolean(disabledResult['rule-providers']['category-ru']), false)

console.log('Country site group checks passed')
