const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getNextUpdateNumber } = require('../utils/updateCounter');
const pendingRequests = require('../utils/pendingRequests');
const getSheetsClient = require('../services/googleSheets');
const { getItems } = require('../utils/itemCache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bulkorder')
        .setDescription('Submit a bulk inventory order for approval.')
        // Required options first
        .addStringOption(option =>
            option.setName('item1')
                .setDescription('First item name')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity1')
                .setDescription('Quantity for first item')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('transaction')
                .setDescription('Transaction type')
                .setRequired(true)
                .addChoices(
                    { name: 'Bought', value: 'Bought' },
                    { name: 'Sold', value: 'Sold' }
                )
        )
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Notes')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('total')
                .setDescription('Total price paid/gained for this bulk order')
                .setRequired(true)
                .setMinValue(0)
        )
        // Optional items/quantities after required
        .addStringOption(option =>
            option.setName('item2')
                .setDescription('Second item name')
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity2')
                .setDescription('Quantity for second item')
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('item3')
                .setDescription('Third item name')
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity3')
                .setDescription('Quantity for third item')
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('item4')
                .setDescription('Fourth item name')
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity4')
                .setDescription('Quantity for fourth item')
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('item5')
                .setDescription('Fifth item name')
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('quantity5')
                .setDescription('Quantity for fifth item')
                .setMinValue(1)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Gather up to 5 items
        const items = [];
        for (let i = 1; i <= 5; i++) {
            const name = interaction.options.getString(`item${i}`);
            const qty = interaction.options.getInteger(`quantity${i}`);
            if (name && qty) items.push({ name, qty });
        }
        const notes = interaction.options.getString('notes') || 'None';
        const transaction = interaction.options.getString('transaction'); // 'Bought' or 'Sold'
        const total = interaction.options.getNumber('total'); // User input
        let totalExpected = 0; // Calculated
        if (items.length === 0) {
            return interaction.editReply({ content: '❌ You must specify at least one item and quantity.', ephemeral: true });
        }

        // Fetch all items from Google Sheets for validation and price/unit info
        const sheets = await getSheetsClient();
        const itemsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Data!A2:E',
        });
        const rows = itemsRes.data.values || [];

        let summaryLines = [];
        let missingItems = [];
        let details = [];

        for (const { name, qty } of items) {
            const row = rows.find(r => r[1] === name);
            if (!row) {
                missingItems.push(name);
                continue;
            }
            const type = row[0];
            const stock = parseInt(row[2], 10);
            const price = parseFloat(row[3]);
            const unitRaw = row[4] && row[4] !== 'N/A' ? row[4] : '';
            const nonPluralUnits = ['oz', 'L', 'ml', 'l'];
            let unit = unitRaw;
            if (
                qty > 2 &&
                unitRaw &&
                !unitRaw.endsWith('s') &&
                !nonPluralUnits.includes(unitRaw.toLowerCase())
            ) {
                unit = `${unitRaw}s`;
            }
            // Calculate stock after based on transaction type
            const stockAfter = transaction === 'Sold'
                ? stock - qty
                : stock + qty;
            summaryLines.push(`• ${name} — ${qty}${unit ? ' ' + unit : ''} (Stock after: ${stockAfter}${unit ? ' ' + unit : ''})`);
            details.push({
                name, qty, type, stock, price, unit
            });
            totalExpected += price * qty;
        }

        if (missingItems.length > 0) {
            return interaction.editReply({
                content: `❌ The following items were not found in inventory: ${missingItems.join(', ')}`,
                ephemeral: true
            });
        }

        const updateNumber = getNextUpdateNumber();

        const embed = new EmbedBuilder()
            .setTitle('Bulk Inventory Order Request')
            .setColor(0x4B0F0F)
            .addFields(
                { name: 'Transaction', value: transaction, inline: true },
                { name: 'Total Price', value: `$${total.toLocaleString()}`, inline: true },
                { name: 'Expected Total', value: `$${totalExpected.toLocaleString()}`, inline: true },
                { name: 'Items', value: summaryLines.join('\n'), inline: false },
                { name: 'Notes', value: notes, inline: false },
                { name: 'Requested by', value: `<@${interaction.user.id}>`, inline: false }
            )
            .setFooter({ text: `Bulk Order #${updateNumber}` })
            .setTimestamp();

        const rowAction = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`approve_bulkorder:${updateNumber}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`deny_bulkorder:${updateNumber}`)
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
            items: details,
            notes,
            userId: interaction.user.id,
            transaction
        });

        await interaction.editReply({ content: '✅ Bulk order submitted for approval!' });
    },

    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            // Only autocomplete for item fields
            if (!focusedOption.name.startsWith('item')) {
                await interaction.respond([]);
                return;
            }

            // Pull all items from cache (no refresh)
            const types = ['Guns', 'Drugs', 'Ammo'];
            let allItems = [];
            for (const type of types) {
                const itemsObj = await getItems(type, true); // true = use cache
                allItems = allItems.concat(Object.keys(itemsObj));
            }
            allItems = [...new Set(allItems)]; // Remove duplicates

            const focusedValue = focusedOption.value?.toLowerCase() || '';
            const filtered = allItems.filter(name =>
                name.toLowerCase().includes(focusedValue)
            );

            await interaction.respond(
                filtered.slice(0, 25).map(name => ({ name, value: name }))
            );
        } catch (err) {
            try { await interaction.respond([]); } catch {}
        }
    }
};