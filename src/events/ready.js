module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        // Register slash commands for a specific guild (instant)
        const guildId = '1398200417787187300'; // <-- Replace with your server's ID
        try {
            await client.application.commands.set(client.commands.map(cmd => cmd.data), guildId);
            console.log('Slash commands registered for guild:', guildId);
        } catch (error) {
            console.error('Failed to register slash commands:', error);
        }
    },
};