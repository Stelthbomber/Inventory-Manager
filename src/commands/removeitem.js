const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../jsons/inventory.json');
const MANAGER_ROLE_ID = process.env.INVENTORY_MANAGER_ROLE_ID;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeitem')
        .setDescription('Remove an item from the inventory (managers only).')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type/category of the item')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to remove')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        let inventory = [];
        if (fs.existsSync(inventoryPath)) {
            inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        }

        if (focusedOption.name === 'type') {
            // Suggest unique types
            const types = [...new Set(inventory.map(item => item.type))];
            const filtered = types.filter(type =>
                type.toLowerCase().includes(focusedOption.value.toLowerCase())
            );
            await interaction.respond(
                filtered.map(type => ({ name: type, value: type }))
            );
        } else if (focusedOption.name === 'item') {
            // Suggest items of the selected type
            const selectedType = interaction.options.getString('type');
            const items = inventory
                .filter(item => item.type === selectedType)
                .map(item => item.name);
            const filtered = items.filter(name =>
                name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );
            await interaction.respond(
                filtered.map(name => ({ name, value: name }))
            );
        }
    },
    async execute(interaction) {
        // Permission check
        if (!interaction.member.roles.cache.has(MANAGER_ROLE_ID)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const type = interaction.options.getString('type');
        const itemName = interaction.options.getString('item');
        let inventory = [];
        if (fs.existsSync(inventoryPath)) {
            inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        }

        const index = inventory.findIndex(
            item => item.type === type && item.name.toLowerCase() === itemName.toLowerCase()
        );
        if (index === -1) {
            return interaction.reply({ content: `Item "${itemName}" of type "${type}" not found.`, ephemeral: true });
        }

        inventory.splice(index, 1);
        fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
        return interaction.reply({ content: `Item "${itemName}" of type "${type}" has been removed.` });
    }
};