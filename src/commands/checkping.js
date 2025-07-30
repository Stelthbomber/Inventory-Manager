const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const COMMAND_ROLE = process.env.STOCKPING_COMMAND_ROLE;

global.nextStockPingTime = global.nextStockPingTime || null;

function hasCommandRole(member) {
    return member.roles.cache.has(COMMAND_ROLE);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkping')
        .setDescription('Check when the next automatic stock ping will occur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        .setDMPermission(false),
    async execute(interaction) {
        if (!hasCommandRole(interaction.member)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }

        let pauseMsg = '';
        if (global.stockPingsPaused) {
            pauseMsg = '\n⏸️ **Automatic stock pings are currently paused.**';
        }

        if (!global.nextStockPingTime) {
            return interaction.reply({ content: `❌ The next auto stock ping time is not set.${pauseMsg}`, ephemeral: true });
        }
        const now = Date.now();
        const msLeft = global.nextStockPingTime - now;
        if (msLeft <= 0) {
            return interaction.reply({ content: `The next auto stock ping is due very soon!${pauseMsg}`, ephemeral: true });
        }
        const minutes = Math.floor(msLeft / 60000) % 60;
        const hours = Math.floor(msLeft / 3600000);
        const nextDate = new Date(global.nextStockPingTime);
        return interaction.reply({
            content: `🕒 The next automatic stock ping is in **${hours}h ${minutes}m** (${nextDate.toLocaleString()}).${pauseMsg}`,
            ephemeral: true
        });
    }
};