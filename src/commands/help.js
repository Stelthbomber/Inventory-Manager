const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const SUPERVISOR_ROLE_ID = process.env.INVENTORY_MANAGER_ROLE_ID;
const COMMAND_ROLE_ID = process.env.STOCKPING_COMMAND_ROLE;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show information about the bot and its commands.'),
    async execute(interaction) {
        const isSupervisor = interaction.member.roles.cache.has(SUPERVISOR_ROLE_ID);
        const isCommand = interaction.member.roles.cache.has(COMMAND_ROLE_ID);

        // PUBLIC COMMANDS (shown to everyone)
        const publicCommands = [
            {
                name: '/invlog',
                value: [
                    'Log Inventory Sale or Purchase.',
                    '• Type of Sale: Bought / Sold',
                    '• Type of Item: Drugs / Guns / Ammo',
                    '• Item: Choose from dropdown',
                    '• Quantity: Number of items',
                    '• Sold For: Total amount of money',
                    '• Notes: Required (reason, location, etc.)'
                ].join('\n')
            },
            {
                name: '/bulklog',
                value: [
                    'Submit a bulk inventory log for approval.',
                    '• Up to 5 items (each with quantity)',
                    '• Transaction: Bought/Sold',
                    '• Total: Total price paid/gained',
                    '• Notes: Required',
                    '• Requires approval by a Supervisor'
                ].join('\n')
            },
            {
                name: '/banklog',
                value: [
                    'Submit a cash-only bank transaction for approval.',
                    '• For deposits or withdrawals that do not involve inventory items',
                    '• Amount: Cash value',
                    '• Direction: In (deposit) / Out (withdrawal)',
                    '• Reason: Required (what it was for, who, etc.)',
                    '• Requires approval by a Supervisor'
                ].join('\n')
            },
            {
                name: '/price',
                value: [
                    'Check Item Price.',
                    'Returns the current suggested price for up to 5 items and quantities.'
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
                name: '/help',
                value: 'Lists all available bot commands and gives a quick explanation for each.'
            },
            {
                name: '/leaderboard',
                value: [
                    'Show the current leaderboard of top sellers since the last reset.',
                    '• `/leaderboard show` — View the leaderboard.',
                    '• `/leaderboard reload` — Refresh the leaderboard channel (anyone can use).'
                ].join('\n')
            },
            {
                name: '/stats',
                value: [
                    'Check your (or another user\'s) all-time sales stats.',
                    '• `/stats user:@username` — See a breakdown of items sold and total sales.'
                ].join('\n')
            }
        ];

        // SUPERVISOR COMMANDS (middle)
        const supervisorCommands = [
            {
                name: '/additem',
                value: [
                    'Add a new item to the inventory list.',
                    '• Type: Drugs / Guns / Ammo',
                    '• Item: Item name',
                    '• Stock: Starting stock',
                    '• Sell Price: Sell price for the item',
                    '• Unit: (required for Drugs)'
                ].join('\n')
            },
            {
                name: '/removeitem',
                value: [
                    'Remove an item from the inventory.',
                    '• Type: Drugs / Guns / Ammo',
                    '• Item: Choose from dropdown',
                    '• Note: Reason for removal'
                ].join('\n')
            },
            {
                name: 'Approvals',
                value: [
                    'Supervisors can approve or deny inventory, bank, and bulk order requests.'
                ].join('\n')
            },
            {
                name: '/clear',
                value: [
                    'Clear leaderboard period totals or all-time sales for a user.',
                    '• `/clear period` - Clear totals for the current period.',
                    '• `/clear alltime` - Clear all-time sales data.'
                ].join('\n')
            }
        ];

        // COMMAND ROLE COMMANDS (bottom)
        const commandCommands = [
            {
                name: '/setlowstock',
                value: [
                    'Set low stock threshold for an item.',
                    '• Only for users with the Command role.'
                ].join('\n')
            },
            {
                name: '/stockping',
                value: [
                    'Ping roles if any items are low on stock.',
                    '• Only for users with the Command role.'
                ].join('\n')
            },
            {
                name: '/checkping',
                value: [
                    'Check when the next automatic stock ping will occur.',
                    '• Only for users with the Command role.'
                ].join('\n')
            },
            {
                name: '/pausepings',
                value: [
                    'Toggle pause/resume for automatic stock pings.',
                    '• Only for users with the Command role.'
                ].join('\n')
            }
        ];

        const embed = new EmbedBuilder()
            .setTitle('🛠️ Inventory Bot Commands')
            .setDescription('Use these slash commands to interact with the bot and log activity.')
            .setColor(0x4B0F0F);

        // Always show public commands first
        for (const cmd of publicCommands) embed.addFields(cmd);

        // Supervisor commands in the middle
        if (isCommand || isSupervisor) {
            for (const cmd of supervisorCommands) embed.addFields(cmd);
        }

        // Command role commands at the bottom (Command role only)
        if (isCommand) {
            for (const cmd of commandCommands) embed.addFields(cmd);
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};