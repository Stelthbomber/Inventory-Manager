const getSheetsClient = require('../services/googleSheets');

let cache = {};
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function refreshCache() {
    try {
        const sheets = await getSheetsClient();
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!A2:E', // <-- Now includes the Unit column
        });
        const rows = res.data.values || [];
        cache = {};
        for (const row of rows) {
            const [type, item, stock, price, unit] = row; // <-- Add unit
            if (!cache[type]) cache[type] = {};
            cache[type][item] = { 
                stock: Number(stock), 
                price: Number(price),
                unit: unit || '' // <-- Store unit (notes)
            };
        }
        lastFetch = Date.now();
        console.log('[ItemCache] Inventory cache refreshed.');
    } catch (err) {
        console.error('[ItemCache] Failed to refresh cache:', err);
    }
}

// Add a "fast" mode for autocomplete
async function getItems(type, fast = false) {
    if (!fast && Date.now() - lastFetch > CACHE_DURATION) {
        await refreshCache();
    }
    return cache[type] || {};
}

async function getItem(type, item, fast = false) {
    if (!fast && Date.now() - lastFetch > CACHE_DURATION) {
        await refreshCache();
    }
    return cache[type]?.[item] || null;
}

// Refresh cache on bot startup
refreshCache();

module.exports = { getItems, refreshCache, getItem };