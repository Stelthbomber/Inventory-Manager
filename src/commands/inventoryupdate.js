const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const getSheetsClient = require('../services/googleSheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventoryupdate')
        .setDescription('Update inventory and balance for a sale or purchase.')
        .addStringOption(option =>
            option.setName('sale_type')
                .setDescription('Type of transaction')
                .setRequired(true)
                .addChoices(
                    { name: 'Sold', value: 'Sold' },
                    { name: 'Bought', value: 'Bought' }
                )
        )
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of item')
                .setRequired(true)
                .addChoices(
                    { name: 'Guns', value: 'Guns' },
                    { name: 'Drugs', value: 'Drugs' },
                    { name: 'Ammo', value: 'Ammo' }
                )
        )
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item name')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Quantity sold or bought')
                .setRequired(true)
                .setMinValue(1)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('Total money for the transaction')
                .setRequired(true)
                .setMinValue(0)
        )
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Who were these items sold to? (Required)')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const saleType = interaction.options.getString('sale_type');
        const type = interaction.options.getString('type');
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const amount = interaction.options.getNumber('amount');
        const notes = interaction.options.getString('notes') || 'None';

        try {
            const sheets = await getSheetsClient();

            // Get current balance
            const balanceRes = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Data!J2',
            });
            let currentBalance = 0;
            const balanceRaw = balanceRes.data.values?.[0]?.[0];
            if (balanceRaw && !isNaN(Number(balanceRaw))) {
                currentBalance = parseFloat(balanceRaw);
            }

            // 1. Find the item row
            const itemsRes = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Data!A2:D',
            });
            const rows = itemsRes.data.values || [];
            const rowIndex = rows.findIndex(row => row[0] === type && row[1] === item);

            if (rowIndex === -1) {
                return await interaction.editReply('❌ Item not found in inventory.');
            }

            // 2. Get current stock and sale price per unit
            const currentStock = parseInt(rows[rowIndex][2], 10);
            const salePricePerUnit = parseFloat(rows[rowIndex][3]);
            const expectedTotal = salePricePerUnit * quantity;

            // 3. Calculate new stock and balance
            let newStock = currentStock;
            let newBalance = currentBalance;
            if (saleType === 'Sold') {
                newStock -= quantity;
                newBalance += amount;
            } else {
                newStock += quantity;
                newBalance -= amount;
            }

            // 4. Prevent negative stock or balance
            if (newStock < 0) {
                return await interaction.editReply('❌ Not enough stock for this transaction.');
            }
            if (newBalance < 0) {
                return await interaction.editReply('❌ Not enough balance for this transaction.');
            }

            // 5. Update stock and balance (in parallel)
            const itemRowNumber = rowIndex + 2; // +2 because sheet starts at A2
            await Promise.all([
                sheets.spreadsheets.values.update({
                    spreadsheetId: process.env.GOOGLE_SHEET_ID,
                    range: `Data!C${itemRowNumber}`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newStock]] },
                }),
                sheets.spreadsheets.values.update({
                    spreadsheetId: process.env.GOOGLE_SHEET_ID,
                    range: 'Data!J2',
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newBalance]] },
                })
            ]);

            await interaction.editReply(':white_check_mark: Update Logged!');

            // Log to inventory log channel
            const logChannelId = process.env.INVENTORY_LOG_CHANNEL_ID;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel && logChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle('Inventory Updated')
                    .setColor(saleType === 'Sold' ? 0x00ff00 : 0xff0000) // Green for Sold, Red for Bought
                    .addFields(
                        { name: 'Type', value: type, inline: true },
                        { name: 'Item', value: item, inline: true },
                        { name: 'Quantity', value: quantity.toString(), inline: true },
                        { name: 'Transaction', value: saleType, inline: true },
                        { name: 'Amount', value: `$${amount.toLocaleString()}`, inline: true },
                        { name: 'Expected Sale Price', value: `$${expectedTotal.toLocaleString()}`, inline: true },
                        { name: 'New Stock', value: newStock.toString(), inline: true },
                        { name: 'New Balance', value: `$${newBalance.toLocaleString()}`, inline: true },
                        { name: 'Notes', value: notes, inline: true },
                    )
                    .setTimestamp();
                logChannel.send({
                    content: `<@${interaction.user.id}>`, // This will ping the user
                    embeds: [embed]
                }).catch(console.error);
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            await interaction.editReply('❌ There was an error updating the inventory. No changes were made.');
        }
    },
};