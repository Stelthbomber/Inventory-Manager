const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong and mentions a user!')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to ping')
                .setRequired(true)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('target');
        await interaction.reply(`Pong ${user}`);
    },
};