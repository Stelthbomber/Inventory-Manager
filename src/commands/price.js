const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getItem, getItems } = require('../utils/itemCache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('price')
        .setDescription('Check the total price and stock for items you want to sell.')
        .addStringOption(option =>
            option.setName('item1')
                .setDescription('First item name')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('amount1')
                .setDescription('Amount of first item')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('item2')
                .setDescription('Second item name')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('amount2')
                .setDescription('Amount of second item')
                .setRequired(false)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('item3')
                .setDescription('Third item name')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('amount3')
                .setDescription('Amount of third item')
                .setRequired(false)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('item4')
                .setDescription('Fourth item name')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('amount4')
                .setDescription('Amount of fourth item')
                .setRequired(false)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option.setName('item5')
                .setDescription('Fifth item name')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('amount5')
                .setDescription('Amount of fifth item')
                .setRequired(false)
                .setMinValue(1)
        ),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        if (!focusedOption.name.startsWith('item')) return;

        try {
            // Get all items from all types
            const types = ['Guns', 'Drugs', 'Ammo'];
            let allItems = [];
            for (const type of types) {
                const itemsObj = await getItems(type, true);
                allItems = allItems.concat(Object.keys(itemsObj));
            }
            // Remove duplicates (if any)
            allItems = [...new Set(allItems)];

            let filtered;
            if (!focusedOption.value) {
                filtered = allItems;
            } else {
                filtered = allItems.filter(name =>
                    name.toLowerCase().includes(focusedOption.value.toLowerCase())
                );
            }

            await interaction.respond(
                filtered.slice(0, 25).map(name => ({ name, value: name }))
            );
        } catch (err) {
            console.error('Autocomplete error (price):', err);
            await interaction.respond([]);
        }
    },
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const items = [
                { name: interaction.options.getString('item1'), amount: interaction.options.getInteger('amount1') },
                { name: interaction.options.getString('item2'), amount: interaction.options.getInteger('amount2') },
                { name: interaction.options.getString('item3'), amount: interaction.options.getInteger('amount3') },
                { name: interaction.options.getString('item4'), amount: interaction.options.getInteger('amount4') },
                { name: interaction.options.getString('item5'), amount: interaction.options.getInteger('amount5') },
            ];

            let totalPrice = 0;
            let allItemsInStock = true;
            const fields = [];

            for (const item of items) {
                if (!item.name || !item.amount) continue;

                // Find the item in any type
                const types = ['Guns', 'Drugs', 'Ammo'];
                let itemData = null;
                for (const type of types) {
                    itemData = await getItem(type, item.name);
                    if (itemData) break;
                }

                if (!itemData) {
                    fields.push({ name: `${item.name}`, value: `❌ Not found in inventory.`, inline: false });
                    allItemsInStock = false;
                    continue;
                }
                const stock = itemData.stock;
                const pricePerUnit = itemData.price;
                const unitRaw = itemData.unit || '';
                const nonPluralUnits = ['oz','L', 'ml','l'];
                // Pluralize unit if amount > 1 and unit is not empty
                let unit = unitRaw;
                if (
                    item.amount > 1 &&
                    unitRaw &&
                    !unitRaw.endsWith('s') &&
                    !nonPluralUnits.includes(unitRaw.toLowerCase())
                ) {
                    unit = `${unitRaw}s`;
                }
                let stockUnit = unitRaw;
                if (
                    stock !== 1 &&
                    unitRaw &&
                    !unitRaw.endsWith('s') &&
                    !nonPluralUnits.includes(unitRaw.toLowerCase())
                ) {
                    stockUnit = `${unitRaw}s`;
                }
                totalPrice += pricePerUnit * item.amount;
                const enoughStock = stock >= item.amount;

                fields.push({
                    name: `${item.name}`,
                    value:
                        `Requested: ${item.amount} ${unit}\n` +
                        `Stock: ${stock} ${stockUnit}\n` +
                        `Unit Price: $${pricePerUnit.toLocaleString()}\n` +
                        `Total: $${(pricePerUnit * item.amount).toLocaleString()}\n` +
                        `Stock Status: ${enoughStock ? '✅ Enough stock' : '❌ Not enough stock'}`,
                    inline: false
                });

                if (!enoughStock) allItemsInStock = false;
            }

            if (fields.length === 0) {
                await interaction.editReply('❌ No valid items provided.');
                return;
            }

            fields.push({
                name: 'Grand Total',
                value: `$${totalPrice.toLocaleString()}`,
                inline: false
            });

            const embed = new EmbedBuilder()
                .setTitle('Price Check')
                .setColor(allItemsInStock ? 0x00ff00 : 0xff0000)
                .addFields(fields)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error checking price:', error);
            try {
                await interaction.editReply('❌ There was an error checking the price.');
            } catch {}
        }
    },
};