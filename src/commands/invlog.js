const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getNextUpdateNumber } = require('../utils/updateCounter');
const pendingRequests = require('../utils/pendingRequests');
const getSheetsClient = require('../services/googleSheets');
const { getItem, getItems } = require('../utils/itemCache');

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
        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity');
        const amount = interaction.options.getNumber('amount');
        const notes = interaction.options.getString('notes');
        const updateNumber = getNextUpdateNumber();

        // Fetch price for the item
        const sheets = await getSheetsClient();
        const itemsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!A2:E',
        });
        const rows = itemsRes.data.values || [];
        const itemRow = rows.find(row => row[0] === type && row[1] === itemName);
        if (!itemRow) {
            return interaction.editReply({
                content: `❌ Item "${itemName}" of type "${type}" was not found in inventory.`,
                ephemeral: true
            });
        }
        const stock = parseInt(itemRow[2], 10);
        const price = parseFloat(itemRow[3]);
        const unitRaw = itemRow[4] || 'N/A';

        // Pluralize unit if quantity > 1 and unit is not N/A or empty
        const nonPluralUnits = ['oz', 'L', 'ml', 'l'];
        let unit = unitRaw;
        if (
            quantity > 2 &&
            unitRaw &&
            unitRaw !== 'N/A' &&
            !unitRaw.endsWith('s') &&
            !nonPluralUnits.includes(unitRaw.toLowerCase())
        ) {
            unit = `${unitRaw}s`;
        }

        // Prevent logging if not enough stock, but allow if "Bought"
        if (saleType === 'Sold' && stock < quantity) {
            return interaction.editReply({
                content: `❌ Not enough stock for **${itemName}**. Available: ${stock} ${unitRaw}, requested: ${quantity} ${unit}.`,
                ephemeral: true
            });
        }

        const expectedTotal = price * quantity;
        const summary = `${itemName} ${quantity} ${unit}`;

        const embed = new EmbedBuilder()
            .setTitle('Inventory Update Request')
            .setColor(0x4B0F0F)
            .addFields(
                { name: 'Item', value: summary, inline: false },
                { name: 'Transaction', value: saleType, inline: true },
                { name: 'Amount', value: `$${amount.toLocaleString()}`, inline: true },
                { name: 'Expected Amount', value: `$${expectedTotal.toLocaleString()}`, inline: false },
                { name: 'Stock After', value: saleType === 'Sold'
                    ? `${stock - quantity} ${unit}`
                    : `${stock + quantity} ${unit}`, inline: false },
                { name: 'Notes', value: notes, inline: false },
                { name: 'Requested by', value: `<@${interaction.user.id}>`, inline: false }
            )
            .setFooter({ text: `Update #${updateNumber}` })
            .setTimestamp();

        // Add Approve and Deny buttons with update number in customId
        const rowAction = new ActionRowBuilder().addComponents(
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
                components: [rowAction]
            });
        }

        pendingRequests.set(updateNumber, {
            saleType, type, item: itemName, quantity, amount, notes, userId: interaction.user.id
        });

        await interaction.editReply(':white_check_mark: Update submitted for approval!');
    },

    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (focusedOption.name !== 'item') return;

            const type = interaction.options.getString('type');
            if (!type) {
                await interaction.respond([]);
                return;
            }

            // Use only cached data here!
            const itemsObj = await getItems(type, true); // true = fast mode, don't refresh cache
            const items = Object.keys(itemsObj);

            const filtered = items.filter(name =>
                name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );

            await interaction.respond(
                filtered.slice(0, 25).map(name => ({ name, value: name }))
            );
            return;
        } catch (err) {
            console.error('Autocomplete error (invlog):', err);
            try {
                await interaction.respond([]);
            } catch {}
            return;
        }
    },
};