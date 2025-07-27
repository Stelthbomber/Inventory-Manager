const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getNextUpdateNumber } = require('../utils/updateCounter');
const pendingRequests = require('../utils/pendingRequests');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banklog')
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

        // Get a unique update number
        const updateNumber = getNextUpdateNumber();
        // Store the pending request
        pendingRequests.set(updateNumber, {
            direction, amount, reason, who, userId: interaction.user.id
        });

        // Build the embed
        const embed = new EmbedBuilder()
            .setTitle('Bank Update Request')
            .setColor(direction === 'In' ? 0x00ff00 : 0xff0000)
            .addFields(
                { name: 'Direction', value: direction, inline: true },
                { name: 'Amount', value: `$${amount.toLocaleString()}`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'To/From', value: who, inline: true },
                { name: 'Requested by', value: `<@${interaction.user.id}>`, inline: false }
            )
            .setFooter({ text: `Update #${updateNumber}` })
            .setTimestamp();

        // Add Approve and Deny buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`approve_bankupdate:${updateNumber}`)
                .setLabel('Approve')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`deny_bankupdate:${updateNumber}`)
                .setLabel('Deny')
                .setStyle(ButtonStyle.Danger)
        );

        // Send to log channel
        const logChannelId = process.env.INVENTORY_LOG_CHANNEL_ID;
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel && logChannel.isTextBased()) {
            await logChannel.send({
                embeds: [embed],
                components: [row]
            });
        }

        await interaction.editReply(':white_check_mark: Bank update submitted for approval!');
    },
};