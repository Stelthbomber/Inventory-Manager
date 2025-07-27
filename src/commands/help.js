const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show information about the bot and its commands.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Inventory Bot Commands')
            .setDescription('Use these slash commands to interact with the bot and log activity.')
            .addFields(
                {
                    name: '/invlog',
                    value: [
                        'Log Inventory Sale or Purchase.',
                        '• Type of Sale: Bought / Sold',
                        '• Type of Item: Drugs / Guns / Ammo',
                        '• Item: Choose from dropdown',
                        '• Quantity: Number of items',
                        '• Sold For: Total amount of money',
                        '• Notes: Optional (reason, location, etc.)'
                    ].join('\n')
                },
                {
                    name: '/banklog',
                    value: [
                        'Log Bank Deposit or Withdrawal.',
                        '• Direction: In / Out',
                        '• Amount: Cash value',
                        '• Reason: What it was for',
                        '• Who: Optional (group, alias, etc.)'
                    ].join('\n')
                },
                {
                    name: '/price',
                    value: [
                        'Check Item Price.',
                        'Returns the current suggested price for a specific amount of items being sold/bought.'
                    ].join('\n')
                },
                {
                    name: '/balance',
                    value: [
                        'Check Bank Balance.',
                        'Displays the total current bank balance for the family account.'
                    ].join('\n')
                },
                {
                    name: '/additem (Roster Admins only)',
                    value: [
                        'Add a new item to the inventory list.',
                        '• Type: Drugs / Guns / Ammo',
                        '• Item: Item name',
                        '• Sell Price: Sell price for the item'
                    ].join('\n')
                },
                {
                    name: '/help',
                    value: 'Lists all available bot commands and gives a quick explanation for each.'
                }
            )
            .setColor(0x4B0F0F);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};