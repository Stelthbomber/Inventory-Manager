const { EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../utils/salesStats');

async function postLeaderboard(channelId, client) {
    // Fetch the channel
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return false;

    // Delete previous bot messages in the channel
    const messages = await channel.messages.fetch({ limit: 20 });
    const botMessages = messages.filter(msg => msg.author.id === client.user.id);
    for (const msg of botMessages.values()) {
        await msg.delete().catch(() => {});
    }

    // Build leaderboard embed
    const leaderboard = getLeaderboard(10);
    let desc = '### 💰 **Top Earners — Sellers Leaderboard**\n\n';
    const medals = ['🏆 **1st Place:**', '🥈 **2nd Place:**', '🥉 **3rd Place:**'];
    leaderboard.forEach(([userId, total], i) => {
        if (i < 3) {
            desc += `${medals[i]} <@${userId}> — \`$${total.toLocaleString()}\`\n`;
        } else {
            desc += `🔹 **${i + 1}th:** <@${userId}> — \`$${total.toLocaleString()}\`\n`;
        }
    });

    if (leaderboard.length === 0) {
        desc += '_No sales data yet._\n';
    }

    desc += '\n🧾 Updated hourly by the Inventory Bot.\nContact **Supervisor+** for questions or disputes.';

    const embed = new EmbedBuilder()
        .setDescription(desc)
        .setColor(0xFFD700);

    await channel.send({ embeds: [embed] });
    return true;
}

module.exports = { postLeaderboard };