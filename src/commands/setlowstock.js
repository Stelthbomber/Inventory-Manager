const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setLowStock } = require('../utils/lowStockConfig');
const { getItems } = require('../utils/itemCache');
const getSheetsClient = require('../services/googleSheets');
const COMMAND_ROLE = process.env.STOCKPING_COMMAND_ROLE;

function hasCommandRole(member) {
    return member.roles.cache.has(COMMAND_ROLE);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlowstock')
        .setDescription('Set low stock threshold for an item.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item name')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('threshold')
                .setDescription('Low stock threshold')
                .setRequired(true)
                .setMinValue(0)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .setDMPermission(false),
    async execute(interaction) {
        if (!hasCommandRole(interaction.member)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }
        const item = interaction.options.getString('item');
        const threshold = interaction.options.getInteger('threshold');

        // Find the type for the item from Google Sheets
        const sheets = await getSheetsClient();
        const itemsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!A2:E',
        });
        const rows = itemsRes.data.values || [];
        const itemRow = rows.find(row => row[1] === item);
        if (!itemRow) {
            return interaction.reply({ content: `❌ Item "${item}" not found in inventory.`, ephemeral: true });
        }
        const type = itemRow[0];

        await setLowStock(type, item, threshold);
        await interaction.reply({ content: `Low stock threshold for **${item}** (${type}) set to **${threshold}**.`, ephemeral: true });
    },
    async autocomplete(interaction) {
        try {
            // Get all items from all types, using cache for speed
            const types = ['Guns', 'Drugs', 'Ammo'];
            let allItems = [];
            for (const type of types) {
                const itemsObj = await getItems(type, true); // true = fast mode, no cache refresh
                allItems = allItems.concat(Object.keys(itemsObj));
            }
            // Remove duplicates (if any)
            allItems = [...new Set(allItems)];

            const focused = interaction.options.getFocused();
            let filtered;
            if (!focused) {
                filtered = allItems;
            } else {
                filtered = allItems.filter(name =>
                    name.toLowerCase().includes(focused.toLowerCase())
                );
            }

            await interaction.respond(
                filtered.slice(0, 25).map(name => ({ name, value: name }))
            );
        } catch (err) {
            try {
                await interaction.respond([]);
            } catch {}
        }
    }
};