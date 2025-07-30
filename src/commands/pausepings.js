const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const COMMAND_ROLE = process.env.STOCKPING_COMMAND_ROLE;

function hasCommandRole(member) {
    return member.roles.cache.has(COMMAND_ROLE);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pausepings')
        .setDescription('Toggle pause/resume for automatic stock pings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .setDMPermission(false),
    async execute(interaction) {
        if (!hasCommandRole(interaction.member)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }
        global.stockPingsPaused = !global.stockPingsPaused;
        await interaction.reply({
            content: global.stockPingsPaused
                ? '⏸️ Automatic stock pings are now **paused**.'
                : '▶️ Automatic stock pings are now **resumed**.',
            ephemeral: true
        });
    }
};