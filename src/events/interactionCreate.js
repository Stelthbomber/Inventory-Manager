const getSheetsClient = require('../services/googleSheets');
const { EmbedBuilder } = require('discord.js');
const pendingRequests = require('../utils/pendingRequests');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle autocomplete for any command with an autocomplete method
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command && typeof command.autocomplete === 'function') {
                try {
                    await command.autocomplete(interaction, client);
                } catch (err) {
                    console.error('Autocomplete error:', err);
                    try { await interaction.respond([]); } catch {}
                }
            } else {
                try { await interaction.respond([]); } catch {}
            }
            return;
        }

        // Handle button interactions (keep your existing logic here)
        if (interaction.isButton()) {
            const [action, updateNumber] = interaction.customId.split(':');
            console.log('Pending get:', updateNumber, pendingRequests.has(Number(updateNumber)));
            const data = pendingRequests.get(Number(updateNumber));
            if (!data) {
                return await interaction.reply({ content: '❌ This update is no longer pending.', ephemeral: true });
            }

            // Permission check
            if (!interaction.member.roles.cache.has(process.env.INVENTORY_MANAGER_ROLE_ID)) {
                return await interaction.reply({ content: '❌ Only inventory managers can approve or deny.', ephemeral: true });
            }

            if (action === 'approve_invupdate') {
                try {
                    const sheets = await getSheetsClient();

                    // Example: Find the row for the item and update stock/balance
                    const itemsRes = await sheets.spreadsheets.values.get({
                        spreadsheetId: process.env.GOOGLE_SHEET_ID,
                        range: 'Data!A2:D',
                    });
                    const rows = itemsRes.data.values || [];
                    const rowIndex = rows.findIndex(row => row[0] === data.type && row[1] === data.item);

                    if (rowIndex === -1) {
                        return await interaction.update({
                            content: '❌ Item not found in inventory.',
                            embeds: [],
                            components: []
                        });
                    }

                    // Get current stock and balance
                    const currentStock = parseInt(rows[rowIndex][2], 10);
                    const balanceRes = await sheets.spreadsheets.values.get({
                        spreadsheetId: process.env.GOOGLE_SHEET_ID,
                        range: 'Data!J2',
                    });
                    let currentBalance = 0;
                    const balanceRaw = balanceRes.data.values?.[0]?.[0];
                    if (balanceRaw && !isNaN(Number(balanceRaw))) {
                        currentBalance = parseFloat(balanceRaw);
                    }

                    // Calculate new stock and balance
                    let newStock = currentStock;
                    let newBalance = currentBalance;
                    if (data.saleType === 'Sold') {
                        newStock -= data.quantity;
                        newBalance += data.amount;
                    } else {
                        newStock += data.quantity;
                        newBalance -= data.amount;
                    }

                    if (newStock < 0) {
                        return await interaction.update({
                            content: '❌ Not enough stock for this transaction.',
                            embeds: [],
                            components: []
                        });
                    }
                    if (newBalance < 0) {
                        return await interaction.update({
                            content: '❌ Not enough balance for this transaction.',
                            embeds: [],
                            components: []
                        });
                    }

                    // Update stock and balance in the sheet
                    const itemRowNumber = rowIndex + 2;
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

                    // Update the embed as before
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor(0x00ff00)
                        .addFields({ name: '\u200B', value: `✅ **Approved by:** <@${interaction.user.id}>` });
                    await interaction.update({ embeds: [embed], components: [] });
                } catch (err) {
                    console.error('Google Sheets update error:', err);
                    await interaction.reply({ content: '❌ Failed to update Google Sheets.', ephemeral: true });
                }
            } else if (action === 'deny_invupdate') {
                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0xff0000)
                    .addFields({ name: '\u200B', value: `❌ **Denied by:** <@${interaction.user.id}>` });
                await interaction.update({ embeds: [embed], components: [] });
            } else if (action === 'approve_bankupdate') {
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

                    // Calculate new balance
                    let newBalance = currentBalance;
                    if (data.direction === 'In') {
                        newBalance += data.amount;
                    } else {
                        newBalance -= data.amount;
                    }

                    if (newBalance < 0) {
                        return await interaction.update({
                            content: '❌ Not enough balance for this transaction.',
                            embeds: [],
                            components: []
                        });
                    }

                    // Update balance in the sheet
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: process.env.GOOGLE_SHEET_ID,
                        range: 'Data!J2',
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: [[newBalance]] },
                    });

                    // Update the embed
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor(0x00ff00)
                        .addFields({ name: '\u200B', value: `✅ **Approved by:** <@${interaction.user.id}>` });
                    await interaction.update({ embeds: [embed], components: [] });
                } catch (err) {
                    console.error('Google Sheets update error:', err);
                    await interaction.reply({ content: '❌ Failed to update Google Sheets.', ephemeral: true });
                }
            } else if (action === 'deny_bankupdate') {
                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0xff0000)
                    .addFields({ name: '\u200B', value: `❌ **Denied by:** <@${interaction.user.id}>` });
                await interaction.update({ embeds: [embed], components: [] });
            } else if (action === 'approve_bulkorder') {
                const request = pendingRequests.get(Number(updateNumber));
                if (!request) {
                    await interaction.reply({ content: '❌ Could not find the bulk order details.', ephemeral: true });
                    return;
                }
                try {
                    const sheets = await getSheetsClient();
                    const itemsRes = await sheets.spreadsheets.values.get({
                        spreadsheetId: process.env.GOOGLE_SHEET_ID,
                        range: 'Data!A2:E',
                    });
                    const rows = itemsRes.data.values || [];

                    // For each item, update the stock in the sheet
                    for (const item of request.items) {
                        const rowIndex = rows.findIndex(r => r[0] === item.type && r[1] === item.name);
                        if (rowIndex === -1) continue;
                        let newStock = item.stock;
                        if (request.transaction === 'Sold') {
                            newStock -= item.qty;
                        } else {
                            newStock += item.qty;
                        }
                        // Sheet rows start at 2 (A2), so add 2 to rowIndex
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: process.env.GOOGLE_SHEET_ID,
                            range: `Data!C${rowIndex + 2}`,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: [[newStock]] },
                        });
                    }

                    // Update the embed
                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor(0x00ff00)
                        .addFields({ name: '\u200B', value: `✅ **Bulk order approved by:** <@${interaction.user.id}>` });
                    await interaction.update({ embeds: [embed], components: [] });
                } catch (err) {
                    console.error('Bulk order Google Sheets update error:', err);
                    await interaction.reply({ content: '❌ Failed to update Google Sheets for bulk order.', ephemeral: true });
                }
            } else if (action === 'deny_bulkorder') {
                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(0xff0000)
                    .addFields({ name: '\u200B', value: `❌ **Bulk order denied by:** <@${interaction.user.id}>` });
                await interaction.update({ embeds: [embed], components: [] });
            }

            // Remove from pending
            pendingRequests.delete(Number(updateNumber));
            return;
        }

        // Handle autocomplete for /removeitem command
        if (interaction.isAutocomplete() && interaction.commandName === 'removeitem') {
            const fs = require('fs');
            const path = require('path');
            const inventoryPath = path.join(__dirname, '../jsons/inventory.json');
            let inventory = [];
            if (fs.existsSync(inventoryPath)) {
                inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
            }
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'type') {
                // Suggest unique types
                const types = [...new Set(inventory.map(item => item.type))];
                const filtered = types.filter(type =>
                    type.toLowerCase().includes(focusedOption.value.toLowerCase())
                );
                return await interaction.respond(
                    filtered.slice(0, 25).map(type => ({ name: type, value: type }))
                );
            } else if (focusedOption.name === 'item') {
                // Suggest items of the selected type
                const selectedType = interaction.options.getString('type');
                const items = inventory
                    .filter(item => item.type === selectedType)
                    .map(item => item.name);
                const filtered = items.filter(name =>
                    name.toLowerCase().includes(focusedOption.value.toLowerCase())
                );
                return await interaction.respond(
                    filtered.slice(0, 25).map(name => ({ name, value: name }))
                );
            }
            return;
        }

        // Only handle commands here
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                // Only reply if not already replied or deferred
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'There was an error!', ephemeral: true });
                }
            }
        }
    },
};