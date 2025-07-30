const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../utils/salesStats');
const { postLeaderboard } = require('../jobs/leaderboardPoster');

const LEADERBOARD_CHANNEL_ID = '1400077734985732136';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show or manage the sellers leaderboard.')
        .addSubcommand(sub =>
            sub.setName('show')
                .setDescription('Show the top sellers by total sales value.')
        )
        .addSubcommand(sub =>
            sub.setName('reload')
                .setDescription('Immediately refresh the leaderboard channel.')
        ),
    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'show') {
            await interaction.deferReply();
            const leaderboard = getLeaderboard(10);

            let desc = '### 💰 **Top Earners — Sellers Leaderboard**\n\n';

            const medals = ['🏆 **1st Place:**', '🥈 **2nd Place:**', '🥉 **3rd Place:**'];
            leaderboard.forEach(([userId, total], i) => {
                if (i < 3) {
                    desc += `${medals[i]} <@${userId}> — \`$${total.toLocaleString()}\`\n`;
                } else {
                    desc += `🔹 **${i + 1}th:** <@${userId}> — \`$${total.toLocaleString()}\`\n`;
                }
            });

            if (leaderboard.length === 0) {
                desc += '_No sales data yet._\n';
            }

            desc += '\n🧾 Updated daily by the Inventory Bot.\nContact **Supervisor+** for questions or disputes.';

            const embed = new EmbedBuilder()
                .setDescription(desc)
                .setColor(0xFFD700);

            await interaction.editReply({ embeds: [embed] });
        } else if (interaction.options.getSubcommand() === 'reload') {
            await interaction.deferReply({ ephemeral: true });

            try {
                // This will post the leaderboard in the designated channel
                const result = await postLeaderboard(LEADERBOARD_CHANNEL_ID, interaction.client);

                if (result) {
                    await interaction.editReply('Leaderboard reloaded and posted in the channel.');
                } else {
                    await interaction.editReply('Failed to reload the leaderboard. Please try again later.');
                }
            } catch (err) {
                // Only reply if not already replied
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'There was an error!', ephemeral: true });
                }
                console.error(err);
            }
        }
    }
};