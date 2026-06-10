import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { InteractionHelper } from '../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your Rocket League rank and assign your rank role')
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('Your RL Tracker profile URL')
                .setRequired(true)
        ),

    async execute(interaction, config, client) {
        try {
            const trackerUrl = interaction.options.getString('url');

            if (!trackerUrl.includes('rocketleague.tracker.network')) {
                return InteractionHelper.safeReply(interaction, {
                    embeds: [errorEmbed('Invalid URL', 'Please provide a valid Rocket League Tracker URL.')],
                    flags: MessageFlags.Ephemeral
                });
            }

            await InteractionHelper.safeReply(interaction, {
                embeds: [successEmbed('Rank Check Started', 'Your rank is being checked. Please wait a moment.')],
                flags: MessageFlags.Ephemeral
            });

            await fetch(process.env.ZAPIER_RANK_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    discordUserId: interaction.user.id,
                    discordUsername: interaction.user.username,
                    guildId: interaction.guildId,
                    trackerUrl: trackerUrl
                })
            });

        } catch (error) {
            logger.error('Rank command execution failed', {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'rank'
            });

            await handleInteractionError(interaction, error, {
                commandName: 'rank',
                source: 'rank_command'
            });
        }
    }
};
