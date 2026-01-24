/**
 * 性能测试脚本
 * 用于测试 global_script.js 处理 YAML 配置的速度
 */

const fs = require('fs');
const yaml = require('js-yaml');

// 导入主脚本的 main 函数
// 由于 global_script.js 没有 module.exports，我们需要读取并执行它
const scriptContent = fs.readFileSync('../global_script.js', 'utf8');

// 创建一个沙箱环境来执行脚本
function loadScript() {
    const scriptFunc = new Function(scriptContent + '\nreturn main;');
    return scriptFunc();
}

const main = loadScript();

// 读取 YAML 配置文件
function loadYamlConfig(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return yaml.load(fileContent);
    } catch (e) {
        console.error('读取 YAML 文件失败:', e.message);
        process.exit(1);
    }
}

// 性能测试函数
function performanceTest(config, iterations = 10) {
    console.log('='.repeat(60));
    console.log('开始性能测试');
    console.log('='.repeat(60));
    console.log(`代理节点数量: ${config.proxies?.length || 0}`);
    console.log(`测试次数: ${iterations}`);
    console.log('-'.repeat(60));

    const times = [];
    let result;

    // 预热运行（不计入统计）
    console.log('预热运行中...');
    main(JSON.parse(JSON.stringify(config)));

    // 正式测试
    console.log('正式测试中...\n');
    for (let i = 0; i < iterations; i++) {
        // 深拷贝配置，避免修改原始数据
        const configCopy = JSON.parse(JSON.stringify(config));
        
        const startTime = process.hrtime.bigint();
        result = main(configCopy);
        const endTime = process.hrtime.bigint();
        
        const duration = Number(endTime - startTime) / 1_000_000; // 转换为毫秒
        times.push(duration);
        
        console.log(`第 ${i + 1} 次: ${duration.toFixed(2)} ms`);
    }

    // 计算统计数据
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const sortedTimes = [...times].sort((a, b) => a - b);
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

    console.log('\n' + '='.repeat(60));
    console.log('测试结果统计');
    console.log('='.repeat(60));
    console.log(`平均耗时: ${avgTime.toFixed(2)} ms`);
    console.log(`最快耗时: ${minTime.toFixed(2)} ms`);
    console.log(`最慢耗时: ${maxTime.toFixed(2)} ms`);
    console.log(`中位数: ${medianTime.toFixed(2)} ms`);
    console.log('-'.repeat(60));
    
    // 输出处理后的配置信息
    console.log('\n处理后的配置信息:');
    console.log(`策略组数量: ${result['proxy-groups']?.length || 0}`);
    console.log(`规则数量: ${result.rules?.length || 0}`);
    console.log(`规则提供者数量: ${Object.keys(result['rule-providers'] || {}).length}`);
    console.log('='.repeat(60));

    return { avgTime, minTime, maxTime, medianTime, result };
}

// 主程序
function runTest() {
    const args = process.argv.slice(2);
    const yamlFile = args[0] || 'test.yaml';
    const iterations = parseInt(args[1]) || 10;

    console.log(`\n读取配置文件: ${yamlFile}`);
    
    if (!fs.existsSync(yamlFile)) {
        console.error(`错误: 文件 ${yamlFile} 不存在`);
        console.log('\n使用方法:');
        console.log('  node test_performance.js <yaml文件路径> [测试次数]');
        console.log('\n示例:');
        console.log('  node test_performance.js test.yaml 10');
        process.exit(1);
    }

    const config = loadYamlConfig(yamlFile);
    const testResult = performanceTest(config, iterations);

    // 可选：保存处理后的配置
    const outputFile = yamlFile.replace('.yaml', '_output.yaml').replace('.yml', '_output.yaml');
    fs.writeFileSync(outputFile, yaml.dump(testResult.result, { lineWidth: -1 }));
    console.log(`\n处理后的配置已保存到: ${outputFile}`);
}

// 执行测试
runTest();
