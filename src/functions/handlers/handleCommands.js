const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const commandFiles = fs.readdirSync(path.join(__dirname, '../../commands')).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(__dirname, '../../commands', file));
        if (!command.data || !command.data.name) {
            console.warn(`[WARN] Command file ${file} is missing data or name. Skipping.`);
            continue;
        }
        client.commands.set(command.data.name, command);
    }
};