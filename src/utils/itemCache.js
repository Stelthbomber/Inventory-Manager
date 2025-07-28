const getSheetsClient = require('../services/googleSheets');

let cache = {};
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function refreshCache() {
    try {
        const sheets = await getSheetsClient();
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!A2:B',
        });
        const rows = res.data.values || [];
        cache = {};
        for (const row of rows) {
            const [type, item] = row;
            if (!cache[type]) cache[type] = [];
            cache[type].push(item);
        }
        lastFetch = Date.now();
        console.log('[ItemCache] Inventory cache refreshed.');
    } catch (err) {
        console.error('[ItemCache] Failed to refresh cache:', err);
    }
}

async function getItems(type) {
    if (Date.now() - lastFetch > CACHE_DURATION) {
        await refreshCache();
    }
    return cache[type] || [];
}

// Refresh cache on bot startup
refreshCache();

module.exports = { getItems, refreshCache };