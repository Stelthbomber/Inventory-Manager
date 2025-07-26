const getSheetsClient = require('../services/googleSheets');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Autocomplete for /price command
        if (interaction.isAutocomplete() && interaction.commandName === 'price') {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'item') {
                try {
                    const sheets = await getSheetsClient();
                    const itemsRes = await sheets.spreadsheets.values.get({
                        spreadsheetId: process.env.GOOGLE_SHEET_ID,
                        range: 'Data!A2:B',
                    });
                    const rows = itemsRes.data.values || [];
                    // Get unique item names, sorted
                    const items = [...new Set(rows.map(row => row[1]))].sort();
                    const input = focusedOption.value?.toLowerCase() || '';
                    const filtered = items.filter(item =>
                        item.toLowerCase().includes(input)
                    );
                    return await interaction.respond(
                        filtered.slice(0, 25).map(item => ({
                            name: item,
                            value: item
                        }))
                    );
                } catch (err) {
                    console.error('Autocomplete error:', err);
                    try { await interaction.respond([]); } catch {}
                    return;
                }
            }
            return;
        }

        // Handle autocomplete for inventoryupdate
        if (interaction.isAutocomplete() && interaction.commandName === 'inventoryupdate') {
            const focusedOption = interaction.options.getFocused(true);
            const type = interaction.options.getString('type');

            if (focusedOption.name === 'item') {
                try {
                    const sheets = await getSheetsClient();
                    const itemsRes = await sheets.spreadsheets.values.get({
                        spreadsheetId: process.env.GOOGLE_SHEET_ID,
                        range: 'Data!A2:B',
                    });
                    let rows = itemsRes.data.values || [];
                    // Filter by type if selected
                    if (type) {
                        rows = rows.filter(row => row[0] === type);
                    }
                    // Get unique item names, sorted
                    const items = [...new Set(rows.map(row => row[1]))].sort();
                    // Filter by what the user has typed so far
                    const input = focusedOption.value?.toLowerCase() || '';
                    const filtered = items.filter(item =>
                        item.toLowerCase().includes(input)
                    );
                    // Only call respond ONCE
                    return await interaction.respond(
                        filtered.slice(0, 25).map(item => ({
                            name: item,
                            value: item
                        }))
                    );
                } catch (err) {
                    console.error('Autocomplete error:', err);
                    // Only call respond ONCE, even on error
                    try {
                        await interaction.respond([]);
                    } catch (e) {
                        // Ignore, already acknowledged
                    }
                    return;
                }
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