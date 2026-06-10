import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { InteractionHelper } from '../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('/rlrank')
        .setDescription('Check your Rocket League rank and assign your rank role')
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('Paste your RL Tracker profile URL')
                .setRequired(true)
        ),

    async execute(interaction, config, client) {
        try {
            const trackerUrl = interaction.options.getString('url');

            if (!trackerUrl || !trackerUrl.includes('rocketleague.tracker.network')) {
                return InteractionHelper.safeReply(interaction, {
                    embeds: [
                        errorEmbed(
                            'Invalid RL Tracker URL',
                            'Please provide a valid Rocket League Tracker profile URL.'
                        )
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            const zapierWebhookUrl = process.env.ZAPIER_RANK_WEBHOOK_URL;

            if (!zapierWebhookUrl) {
                return InteractionHelper.safeReply(interaction, {
                    embeds: [
                        errorEmbed(
                            'Setup Error',
                            'Zapier webhook URL is missing from Railway variables.'
                        )
                    ],
                    flags: MessageFlags.Ephemeral
                });
            }

            await InteractionHelper.safeReply(interaction, {
                embeds: [
                    successEmbed(
                        'Rank Check Started',
                        'Your Rocket League rank is being checked. Please wait a moment.'
                    )
                ],
                flags: MessageFlags.Ephemeral
            });

            const response = await fetch(zapierWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    discordUserId: interaction.user.id,
                    discordUsername: interaction.user.username,
                    discordTag: interaction.user.tag,
                    guildId: interaction.guildId,
                    channelId: interaction.channelId,
                    trackerUrl: trackerUrl
                })
            });

            if (!response.ok) {
                throw new Error(`Zapier webhook failed with status ${response.status}`);
            }

            logger.info('Rank check sent to Zapier', {
                userId: interaction.user.id,
                username: interaction.user.username,
                guildId: interaction.guildId,
                trackerUrl
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
