const fs = require('fs');
const path = require('path');
const statsDir = path.join(__dirname, '../jsons');
const statsPath = path.join(statsDir, 'salesStats.json');

// Ensure the directory exists before any file operation
if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir, { recursive: true });
}

function loadStats() {
    if (!fs.existsSync(statsPath)) return {};
    return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
}

function saveStats(stats) {
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
}

function addSale(userId, itemName, amount, quantity = 1) {
    const stats = loadStats();
    if (!stats[userId]) stats[userId] = { total: 0, periodTotal: 0, items: {} };
    if (typeof stats[userId].total !== 'number' || isNaN(stats[userId].total)) stats[userId].total = 0;
    if (typeof stats[userId].periodTotal !== 'number' || isNaN(stats[userId].periodTotal)) stats[userId].periodTotal = 0;
    stats[userId].total += amount;
    stats[userId].periodTotal += amount;

    if (!itemName || itemName === 'undefined') return;

    if (!stats[userId].items[itemName]) stats[userId].items[itemName] = { money: 0, qty: 0 };
    if (typeof stats[userId].items[itemName].money !== 'number' || isNaN(stats[userId].items[itemName].money)) stats[userId].items[itemName].money = 0;
    if (typeof stats[userId].items[itemName].qty !== 'number' || isNaN(stats[userId].items[itemName].qty)) stats[userId].items[itemName].qty = 0;
    stats[userId].items[itemName].money += amount;
    stats[userId].items[itemName].qty += quantity;
    saveStats(stats);
}

function getLeaderboard(limit = 10) {
    const stats = loadStats();
    return Object.entries(stats)
        .map(([userId, data]) => [userId, data.periodTotal || 0])
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function resetLeaderboardTotals() {
    const stats = loadStats();
    for (const userId in stats) {
        if (stats[userId] && typeof stats[userId] === 'object') {
            stats[userId].total = 0;
        }
    }
    saveStats(stats);
}

module.exports = { addSale, loadStats, saveStats, getLeaderboard, resetLeaderboardTotals };