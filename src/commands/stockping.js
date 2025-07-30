const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkAndPingStock } = require('../utils/stockpingUtil');
const COMMAND_ROLE = process.env.STOCKPING_COMMAND_ROLE;

function hasCommandRole(member) {
    return member.roles.cache.has(COMMAND_ROLE);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stockping')
        .setDescription('Ping roles if any items are low on stock.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Or adjust as needed
    async execute(interaction) {
        if (!hasCommandRole(interaction.member)) {
            return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });
        const content = await checkAndPingStock(interaction.client, true);
        await interaction.editReply(content || '✅ No items are currently low on stock.');
    }
};