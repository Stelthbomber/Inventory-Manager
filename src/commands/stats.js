const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadStats } = require('../utils/salesStats');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Check a detailed breakdown of what a user has sold.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check')
                .setRequired(false) // <-- Make this optional
        ),
    async execute(interaction) {
        // Use the provided user, or default to the command user
        const user = interaction.options.getUser('user') || interaction.user;
        const stats = loadStats();
        const userStats = stats[user.id];

        let breakdownLines = [];
        let total = 0;

        if (userStats && userStats.items) {
            total = typeof userStats.total === 'number' && !isNaN(userStats.total) ? userStats.total : 0;
            for (const [item, data] of Object.entries(userStats.items)) {
                if (
                    item !== 'undefined' &&
                    data &&
                    typeof data.money === 'number' &&
                    data.money > 0 &&
                    typeof data.qty === 'number' &&
                    data.qty > 0
                ) {
                    breakdownLines.push(`• **${item}**: ${data.qty} sold — $${data.money.toLocaleString()}`);
                }
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(`Sales Stats for ${user.username}`)
            .setColor(0x3498db);

        if (breakdownLines.length === 1) {
            embed.setDescription(
                `<@${user.id}> has sold:\n\n${breakdownLines[0]}\n\n**Total Sales:** $${total.toLocaleString()}`
            );
        } else if (breakdownLines.length > 1) {
            embed.setDescription(
                `<@${user.id}> has sold:\n\n${breakdownLines.join('\n')}\n\n**Total Sales:** $${total.toLocaleString()}`
            );
        } else {
            embed.setDescription(`<@${user.id}> has not logged any sales yet.`);
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};