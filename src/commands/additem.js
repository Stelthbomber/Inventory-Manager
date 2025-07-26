// Add this to your .env file:
// INVENTORY_LOG_CHANNEL_ID=YOUR_CHANNEL_ID

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const getSheetsClient = require('../services/googleSheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additem')
        .setDescription('Adds a new item to the inventory data sheet.')
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
            option.setName('item').setDescription('Item name').setRequired(true))
        .addIntegerOption(option =>
            option.setName('stock')
                .setDescription('Current stock amount')
                .setRequired(true)
                .setMinValue(0)
        )
        .addNumberOption(option =>
            option.setName('price')
                .setDescription('Sale price per unit')
                .setRequired(true)
                .setMinValue(0)
        ),
    async execute(interaction) {
        // Role check using .env role ID
        const managerRoleId = process.env.INVENTORY_MANAGER_ROLE_ID;
        if (!interaction.member.roles.cache.has(managerRoleId)) {
            // Only reply ONCE, do not defer!
            return await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const type = interaction.options.getString('type');
            const item = interaction.options.getString('item');
            const stock = interaction.options.getInteger('stock');
            const price = interaction.options.getNumber('price');

            const formattedPrice = `$${price.toLocaleString()}`;

            const sheets = await getSheetsClient();

            // Check for duplicate item
            const existing = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Data!A2:B',
            });
            const rows = existing.data.values || [];
            if (rows.some(row => row[0] === type && row[1] === item)) {
                return await interaction.editReply({
                    content: '❌ This item already exists in the inventory.'
                });
            }

            // Append new row
            await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Data!A:D',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[type, item, stock, price]] },
            });

            await interaction.editReply({
                content: '✅ Item added to the inventory!'
            });

            // Log embed to inventory log channel (independent, not awaited)
            const logChannelId = process.env.INVENTORY_LOG_CHANNEL_ID;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel && logChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle('Inventory Item Added')
                    .setColor(0xffa500)
                    .addFields(
                        { name: 'Type', value: type, inline: true },
                        { name: 'Item', value: item, inline: true },
                        { name: 'Stock', value: stock.toString(), inline: true },
                        { name: 'Price', value: formattedPrice, inline: true }
                    )
                    .setTimestamp();
                logChannel.send({
                    content: `<@${interaction.user.id}>`, // This will actually ping the user
                    embeds: [embed]
                }).catch(console.error);
            }
        } catch (error) {
            console.error('Error adding item:', error);
            await interaction.editReply({
                content: '❌ There was an error adding the item. Please try again later.'
            });
        }
    },
};