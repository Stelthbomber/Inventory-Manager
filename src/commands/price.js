const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const getSheetsClient = require('../services/googleSheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('price')
        .setDescription('Check the total price and stock for items you want to sell.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item name')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('amount of items you want to sell')
                .setRequired(true)
                .setMinValue(1)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const item = interaction.options.getString('item');
        const amount = interaction.options.getInteger('amount');

        try {
            const sheets = await getSheetsClient();
            // Get all items from the sheet
            const itemsRes = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Data!A2:D',
            });
            const rows = itemsRes.data.values || [];
            // Find the item (case-insensitive)
            const row = rows.find(row => row[1].toLowerCase() === item.toLowerCase());

            if (!row) {
                return await interaction.editReply('❌ Item not found in inventory.');
            }

            const stock = parseInt(row[2], 10);
            const pricePerUnit = parseFloat(row[3]);
            const totalPrice = pricePerUnit * amount;

            const enoughStock = stock >= amount;

            const embed = new EmbedBuilder()
                .setTitle('Price Check')
                .setColor(enoughStock ? 0x00ff00 : 0xff0000)
                .addFields(
                    { name: 'Item', value: row[1], inline: true },
                    { name: 'Requested amount', value: amount.toString(), inline: true },
                    { name: 'Available Stock', value: stock.toString(), inline: true },
                    { name: 'Unit Price', value: `$${pricePerUnit.toLocaleString()}`, inline: true },
                    { name: 'Total Price', value: `$${totalPrice.toLocaleString()}`, inline: true },
                    { name: 'Stock Status', value: enoughStock ? '✅ Enough stock available.' : '❌ Not enough stock.', inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error checking price:', error);
            await interaction.editReply('❌ There was an error checking the price.');
        }
    },
};