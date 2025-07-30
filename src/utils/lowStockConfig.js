const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, 'lowStock.json');

function readConfig() {
    if (!fs.existsSync(configPath)) return {};
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function writeConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function setLowStock(type, item, threshold) {
    const config = readConfig();
    if (!config[type]) config[type] = {};
    config[type][item] = threshold;
    writeConfig(config);
}

async function getLowStock(type, item) {
    const config = readConfig();
    return config[type]?.[item];
}

async function getItems(type) {
    const config = readConfig();
    return config[type] || {};
}

module.exports = { setLowStock, getLowStock, getItems };