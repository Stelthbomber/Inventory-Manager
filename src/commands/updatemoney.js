const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const getSheetsClient = require('../services/googleSheets');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('updatemoney')
        .setDescription('Update the balance (add or subtract money).')
        .addStringOption(option =>
            option.setName('direction')
                .setDescription('Is this money coming in or going out?')
                .setRequired(true)
                .addChoices(
                    { name: 'In', value: 'In' },
                    { name: 'Out', value: 'Out' }
                )
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('How much money?')
                .setRequired(true)
                .setMinValue(0.01)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('What is this money for?')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('who')
                .setDescription('Who is this money from/to?')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const direction = interaction.options.getString('direction');
        const amount = interaction.options.getNumber('amount');
        const reason = interaction.options.getString('reason');
        const who = interaction.options.getString('who');

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

            let newBalance = direction === 'In'
                ? currentBalance + amount
                : currentBalance - amount;

            if (newBalance < 0) {
                return await interaction.editReply('❌ Not enough balance for this transaction.');
            }

            await sheets.spreadsheets.values.update({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Data!J2',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[newBalance]] },
            });

            await interaction.editReply(':white_check_mark: Balance updated!');

            // Log to inventory log channel
            const logChannelId = process.env.INVENTORY_LOG_CHANNEL_ID;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel && logChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setTitle('Balance Updated')
                    .setColor(direction === 'In' ? 0x00ff00 : 0xff0000) // Green for In, Red for Out
                    .addFields(
                        { name: 'Direction', value: direction, inline: true },
                        { name: 'Amount', value: `$${amount.toLocaleString()}`, inline: true },
                        { name: 'New Balance', value: `$${newBalance.toLocaleString()}`, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'To/From', value: who, inline: true },
                    )
                    .setTimestamp();
                logChannel.send({
                    content: `<@${interaction.user.id}>`,
                    embeds: [embed]
                }).catch(console.error);
            }
        } catch (error) {
            console.error('Error updating balance:', error);
            await interaction.editReply('❌ There was an error updating the balance. No changes were made.');
        }
    },
};