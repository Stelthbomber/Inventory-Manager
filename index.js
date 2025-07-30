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

const { checkAndPingStock } = require('./src/commands/stockping');
const channel = client.channels.cache.get(1398211200491192354); // Replace with your log channel ID

global.nextStockPingTime = Date.now() + 12 * 60 * 60 * 1000; // 12 hours from now
global.stockPingsPaused = false;

setInterval(() => {
    if (!global.stockPingsPaused && channel) checkAndPingStock(channel, false);
    // Optionally, update nextStockPingTime only if not paused
    if (!global.stockPingsPaused) {
        global.nextStockPingTime = Date.now() + 12 * 60 * 60 * 1000;
    }
}, 12 * 60 * 60 * 1000); // Every 12 hours

client.login(process.env.DISCORD_TOKEN);