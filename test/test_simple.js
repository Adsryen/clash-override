/**
 * 简化版性能测试脚本
 * 直接测试 global_script.js 的处理速度
 */

const fs = require('fs');
const yaml = require('js-yaml');

// 读取并执行 global_script.js
eval(fs.readFileSync('../global_script.js', 'utf8'));

// 读取 YAML 配置
const yamlFile = process.argv[2] || 'test.yaml';
const config = yaml.load(fs.readFileSync(yamlFile, 'utf8'));

console.log(`\n测试文件: ${yamlFile}`);
console.log(`节点数量: ${config.proxies?.length || 0}\n`);

// 测试 10 次
const times = [];
for (let i = 0; i < 10; i++) {
    const start = Date.now();
    const result = main(JSON.parse(JSON.stringify(config)));
    const duration = Date.now() - start;
    times.push(duration);
    console.log(`第 ${i + 1} 次: ${duration} ms`);
}

const avg = times.reduce((a, b) => a + b) / times.length;
console.log(`\n平均耗时: ${avg.toFixed(2)} ms`);
console.log(`最快: ${Math.min(...times)} ms`);
console.log(`最慢: ${Math.max(...times)} ms`);
