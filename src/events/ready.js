module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);
        // Register slash commands for your guild(s)
        const guild = client.guilds.cache.first();
        if (guild) {
            await guild.commands.set(client.commands.map(cmd => cmd.data));
            console.log('Slash commands registered.');
        }
    },
};