const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const getSheetsClient = require('../services/googleSheets');
const { getLowStock } = require('../utils/lowStockConfig');

const GUNS_ROLE = process.env.LOW_STOCK_GUNS_ROLE;
const DRUGS_ROLE = process.env.LOW_STOCK_DRUGS_ROLE;
const COMMAND_ROLE = process.env.STOCKPING_COMMAND_ROLE;
const PING_CHANNEL_ID = process.env.STOCK_PING_CHANNEL_ID; // Add this to your .env

function hasCommandRole(member) {
    return member.roles.cache.has(COMMAND_ROLE);
}

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
        const lowThreshold = await getLowStock(type, item) ?? 5; // Default 5

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

    // Send to the ping channel if there is content to send
    if (content && PING_CHANNEL_ID) {
        const channel = await client.channels.fetch(PING_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
            await channel.send({ content });
        }
    }
    return content;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stockping')
        .setDescription('Ping roles if any items are low on stock.')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .setDMPermission(false),
    async execute(interaction) {
        if (!hasCommandRole(interaction.member)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }
        await interaction.reply({ content: '🔔 Stock ping sent!', ephemeral: true });
        await checkAndPingStock(interaction.client, true);
    }
};