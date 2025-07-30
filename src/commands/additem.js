// Add this to your .env file:
// INVENTORY_LOG_CHANNEL_ID=YOUR_CHANNEL_ID

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const getSheetsClient = require('../services/googleSheets');
const { getItem, refreshCache } = require('../utils/itemCache');

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
        )
        .addStringOption(option =>
            option.setName('unit')
                .setDescription('Unit type (required for Drugs, e.g. g, oz, pill)')
                .setRequired(false)
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
            let unit = interaction.options.getString('unit') || '';

            // Require unit for Drugs
            if (type === 'Drugs' && !unit) {
                return await interaction.editReply({
                    content: '❌ You must specify a unit type for Drugs (e.g. g, oz, pill).'
                });
            }

            const formattedPrice = `$${price.toLocaleString()}`;

            const sheets = await getSheetsClient();

            const itemData = await getItem(type, item);
            if (itemData) {
                return await interaction.editReply({
                    content: '❌ This item already exists in the inventory.'
                });
            }

            // Append new row (now includes unit column)
            await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Data!A:E',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[type, item, stock, price, unit]] },
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
                        { name: 'Price', value: formattedPrice, inline: true },
                        { name: 'Unit', value: unit || 'N/A', inline: true }
                    )
                    .setTimestamp();
                logChannel.send({
                    content: `<@${interaction.user.id}>`,
                    embeds: [embed]
                }).catch(console.error);
            }

            // Refresh the item cache
            await refreshCache();
        } catch (error) {
            console.error('Error adding item:', error);
            await interaction.editReply({
                content: '❌ There was an error adding the item. Please try again later.'
            });
        }
    },
};