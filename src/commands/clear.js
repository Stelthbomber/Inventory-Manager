const { SlashCommandBuilder } = require('discord.js');
const { loadStats, saveStats } = require('../utils/salesStats');
const { postLeaderboard } = require('../jobs/leaderboardPoster');

const LEADERBOARD_CHANNEL_ID = '1400077734985732136';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear leaderboard or stats.')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('What to clear')
                .setRequired(true)
                .addChoices(
                    { name: 'leaderboard', value: 'leaderboard' },
                    { name: 'stats', value: 'stats' }
                )
        ),
    async execute(interaction) {
        const allowedRole = process.env.STOCKPING_COMMAND_ROLE;
        if (!interaction.member.roles.cache.has(allowedRole)) {
            return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const target = interaction.options.getString('target');
        const stats = loadStats();

        if (target === 'leaderboard') {
            for (const userId in stats) {
                stats[userId].periodTotal = 0;
            }
            saveStats(stats);
            await postLeaderboard(LEADERBOARD_CHANNEL_ID, interaction.client);
            await interaction.reply({ content: 'Leaderboard has been cleared and reloaded!', ephemeral: true });
        } else if (target === 'stats') {
            saveStats({});
            await interaction.reply({ content: 'All stats have been cleared!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Invalid target.', ephemeral: true });
        }
    }
};