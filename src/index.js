'use strict';
require('dotenv').config();

const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handleInteraction } = require('./handlers/interactionHandler');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  await setupWelcomeMessage();
});

client.on(Events.InteractionCreate, handleInteraction);

const WELCOME_TEXT = process.env.WELCOME_MESSAGE || [
  '## Welcome to **Voice Community**!',
  '',
  'Generate your exclusive membership card to prove your Day-One status,',
  'or invite your frens and earn rewards together.',
].join('\n');

const WELCOME_COMPONENTS = [
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('generate_card').setLabel('Generate membership card').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('invite_frens').setLabel('Invite frens').setStyle(ButtonStyle.Secondary),
  ),
];

async function setupWelcomeMessage() {
  const channelId = process.env.CHANNEL_ID?.trim();
  if (!channelId) { console.warn('CHANNEL_ID not set'); return; }

  let channel;
  try { channel = await client.channels.fetch(channelId); }
  catch (err) { console.error('Could not fetch channel:', err.message); return; }

  if (!channel?.isTextBased()) { console.error('Not a text channel'); return; }

  try {
    const recent = await channel.messages.fetch({ limit: 50 });
    const existing = recent.find(m => m.author.id === client.user.id && m.components.length > 0);
    if (existing) { console.log('Welcome message already exists'); return; }
  } catch {}

  const msg = await channel.send({ content: WELCOME_TEXT, components: WELCOME_COMPONENTS });
  console.log(`Welcome message posted: ${msg.id}`);
}

const token = process.env.DISCORD_TOKEN?.trim();
if (!token) { console.error('DISCORD_TOKEN not set'); process.exit(1); }
client.login(token);
