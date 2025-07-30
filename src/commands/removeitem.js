const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getItems, refreshCache, getItem } = require('../utils/itemCache');
const getSheetsClient = require('../services/googleSheets');
const MANAGER_ROLE_ID = process.env.INVENTORY_MANAGER_ROLE_ID;
const LOG_CHANNEL_ID = process.env.INVENTORY_LOG_CHANNEL_ID;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeitem')
        .setDescription('Remove an item from the inventory (managers only).')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type/category of the item')
                .setRequired(true)
                .addChoices(
                    { name: 'Guns', value: 'Guns' },
                    { name: 'Drugs', value: 'Drugs' },
                    { name: 'Ammo', value: 'Ammo' }
                )
        )
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to remove')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('note')
                .setDescription('Reason for removal')
                .setRequired(true)
        ),
    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name !== 'item') {
                await interaction.respond([]);
                return;
            }

            const type = interaction.options.getString('type');
            if (!type) {
                await interaction.respond([]);
                return;
            }

            const itemsObj = await getItems(type, true); // true = fast mode, no cache refresh
            const items = Object.keys(itemsObj);
            const filtered = items.filter(name =>
                name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );
            await interaction.respond(filtered.slice(0, 25).map(name => ({ name, value: name })));
            return;
        } catch (err) {
            console.error('Autocomplete error (removeitem):', err);
            try {
                await interaction.respond([]);
            } catch {}
            return;
        }
    },
    async execute(interaction, client) {
        // Permission check
        if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const type = interaction.options.getString('type');
        const itemName = interaction.options.getString('item');
        const note = interaction.options.getString('note');
        const sheets = await getSheetsClient();

        const itemData = await getItem(type, itemName);
        if (!itemData) {
            return interaction.reply({ content: `Item "${itemName}" of type "${type}" not found.`, ephemeral: true });
        }

        // Get all items from the sheet
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!A2:B',
        });
        const rows = res.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === type && row[1] === itemName);

        if (rowIndex === -1) {
            return interaction.reply({ content: `Item "${itemName}" of type "${type}" not found.`, ephemeral: true });
        }

        // Remove the row from the sheet
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: 0, // Adjust if your Data sheet is not the first sheet
                            dimension: 'ROWS',
                            startIndex: rowIndex + 1, // +1 because A2 is row 1 in zero-indexed API
                            endIndex: rowIndex + 2
                        }
                    }
                }]
            }
        });

        await refreshCache();

        // Log the removal
        const embed = new EmbedBuilder()
            .setTitle('Item Removed')
            .setColor(0xff0000)
            .addFields(
                { name: 'Type', value: type, inline: true },
                { name: 'Item', value: itemName, inline: true },
                { name: 'Removed by', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Note', value: note, inline: false }
            )
            .setTimestamp();

        if (client && client.channels && LOG_CHANNEL_ID) {
            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        }

        return interaction.reply({ content: `Item "${itemName}" of type "${type}" has been removed and logged.`, ephemeral: true });
    }
};