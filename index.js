require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load function handlers from src/functions/handlers
const handlersPath = path.join(__dirname, 'src', 'functions', 'handlers');
const handlerFiles = fs.readdirSync(handlersPath).filter(file => file.endsWith('.js'));

for (const file of handlerFiles) {
    require(path.join(handlersPath, file))(client);
}

const { postLeaderboard } = require('./src/jobs/leaderboardPoster');
const { checkAndPingStock } = require('./src/utils/stockpingUtil');

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Post leaderboard immediately and then every hour
    postLeaderboard('1400077734985732136', client);
    setInterval(() => postLeaderboard('1400077734985732136', client), 60 * 60 * 1000);

    // Reping stock immediately and then every 12 hours
    checkAndPingStock(client, false);
    setInterval(() => checkAndPingStock(client, false), 12 * 60 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);