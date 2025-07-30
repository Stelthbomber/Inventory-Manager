const getSheetsClient = require('../services/googleSheets');
const { getLowStock } = require('../utils/lowStockConfig');

const GUNS_ROLE = process.env.LOW_STOCK_GUNS_ROLE;
const DRUGS_ROLE = process.env.LOW_STOCK_DRUGS_ROLE;
const PING_CHANNEL_ID = process.env.STOCK_PING_CHANNEL_ID;

async function checkAndPingStock(client, isManual = false) {
    const sheets = await getSheetsClient();
    const itemsRes = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Data!A2:E',
    });
    const rows = itemsRes.data.values || [];

    let gunsAmmoLow = [];
    let drugsLow = [];

    for (const row of rows) {
        const [type, item, stockStr] = row;
        const stock = parseInt(stockStr, 10);
        const lowThreshold = await getLowStock(type, item) ?? 5;

        if (stock <= lowThreshold) {
            if (type === 'Guns' || type === 'Ammo') {
                gunsAmmoLow.push(`• ${item} — ${stock}`);
            } else if (type === 'Drugs') {
                drugsLow.push(`• ${item} — ${stock}`);
            }
        }
    }

    let content = '';
    if (gunsAmmoLow.length > 0) {
        content += `:gun: <@&${GUNS_ROLE}> — Guns/Ammo Low Stock\n> ${gunsAmmoLow.join('\n> ')}\n\n`;
    }
    if (drugsLow.length > 0) {
        content += `:pill: <@&${DRUGS_ROLE}> — Drugs Low Stock\n> ${drugsLow.join('\n> ')}\n\n`;
    }
    if (!content) {
        content = isManual ? '✅ No items are currently low on stock.' : '';
    }

    if (content && PING_CHANNEL_ID) {
        const channel = await client.channels.fetch(PING_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);
            for (const msg of botMessages.values()) {
                await msg.delete().catch(() => {});
            }
            await channel.send({ content });
        }
    }
    return content;
}

module.exports = { checkAndPingStock };