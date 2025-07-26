const { SlashCommandBuilder } = require('discord.js');
const getSheetsClient = require('../services/googleSheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Displays the Ancelotti Crime Family's bank balance."),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const sheets = await getSheetsClient();
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Data!J2',
            });

            if (!res.data.values || !res.data.values[0] || !res.data.values[0][0]) {
                return await interaction.editReply('❌ Could not find a balance value in the sheet.');
            }

            const balance = res.data.values[0][0];

            await interaction.editReply(`💰 Current bank balance: **${balance}**`);
        } catch (error) {
            console.error('Error fetching balance:', error);
            await interaction.editReply('❌ There was an error fetching the balance. Please try again later.');
        }
    },
};