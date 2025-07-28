const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getNextUpdateNumber } = require('../utils/updateCounter');
const pendingRequests = require('../utils/pendingRequests');
const getSheetsClient = require('../services/googleSheets');
const { getItems } = require('../utils/itemCache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invlog')
        .setDescription('Submit an inventory update for approval.')
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
                .setDescription('Quantity')
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
                .setDescription('Notes')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Gather options
        const saleType = interaction.options.getString('sale_type');
        const type = interaction.options.getString('type');
        const item = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const amount = interaction.options.getNumber('amount');
        const notes = interaction.options.getString('notes');

        // Get and increment update number
        const updateNumber = getNextUpdateNumber();

        pendingRequests.set(updateNumber, { saleType, type, item, quantity, amount, notes, userId: interaction.user.id });
        console.log('Pending set:', updateNumber, pendingRequests.has(updateNumber));

        // Build embed
        const embed = new EmbedBuilder()
            .setTitle('Inventory Update Request')
            .setColor(0x4B0F0F)
            .addFields(
                { name: 'Type', value: type, inline: true },
                { name: 'Item', value: item, inline: true },
                { name: 'Quantity', value: quantity.toString(), inline: true },
                { name: 'Transaction', value: saleType, inline: true },
                { name: 'Amount', value: `$${amount.toLocaleString()}`, inline: true },
                { name: 'Notes', value: notes, inline: false },
                { name: 'Requested by', value: `<@${interaction.user.id}>`, inline: false }
            )
            .setFooter({ text: `Update #${updateNumber}` })
            .setTimestamp();

        // Add Approve and Deny buttons with update number in customId
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`approve_invupdate:${updateNumber}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`deny_invupdate:${updateNumber}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
        );

        // Send to log channel
        const logChannelId = process.env.INVENTORY_LOG_CHANNEL_ID;
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel && logChannel.isTextBased()) {
            await logChannel.send({
                embeds: [embed],
                components: [row]
            });
        }

        await interaction.editReply(':white_check_mark: Update submitted for approval!');
    },

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name !== 'item') return;

        const type = interaction.options.getString('type');
        if (!type) {
            await interaction.respond([]);
            return;
        }

        try {
            const items = await getItems(type);

            let filtered;
            if (!focusedOption.value) {
                filtered = items;
            } else {
                filtered = items.filter(name =>
                    name.toLowerCase().includes(focusedOption.value.toLowerCase())
                );
            }

            await interaction.respond(
                filtered.slice(0, 25).map(name => ({ name, value: name }))
            );
        } catch (err) {
            console.error('Autocomplete error (invlog):', err);
            await interaction.respond([]);
        }
    },
};