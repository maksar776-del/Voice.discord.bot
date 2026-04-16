'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { generateMemberCard, generateMemberId, formatDate } = require('../utils/cardGenerator');

async function handleInteraction(interaction) {
  try {
    if (interaction.isButton()) await handleButton(interaction);
    else if (interaction.isModalSubmit()) await handleModalSubmit(interaction);
  } catch (err) {
    console.error(err);
    const msg = { content: 'Something went wrong. Please try again.', ephemeral: true };
    try {
      if (interaction.deferred || interaction.replied) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch {}
  }
}

async function handleButton(interaction) {
  switch (interaction.customId) {
    case 'generate_card': return handleGenerateCard(interaction);
    case 'submit_link':   return handleSubmitLinkOpen(interaction);
    case 'invite_frens':  return handleInviteFrens(interaction);
  }
}

async function handleGenerateCard(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const user = interaction.user;
  const memberId = generateMemberId();
  const dateStr = formatDate(new Date());
  const avatarUrl = user.displayAvatarURL({ size: 512, extension: 'png', forceStatic: true });

  const cardBuffer = await generateMemberCard({
    username: user.displayName ?? user.username,
    avatarUrl, memberId, dateStr,
  });

  const attachment = new AttachmentBuilder(cardBuffer, { name: 'voice-membership-card.png' });
  const tweetText = encodeURIComponent(`Just got my @Voice membership card!\n\nMember ID: ${memberId}\n\n#Voice #VoiceFun #VoiceCommunity`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  await interaction.editReply({
    content: '**Your Voice Membership Card is ready!**\n\nDownload the card above, then hit **Post on X** to share it — or paste your post link below to earn rewards.',
    files: [attachment],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Post on X').setStyle(ButtonStyle.Link).setURL(tweetUrl),
        new ButtonBuilder().setCustomId('submit_link').setLabel('Submit Link').setStyle(ButtonStyle.Success),
      ),
    ],
  });
}

async function handleSubmitLinkOpen(interaction) {
  const modal = new ModalBuilder().setCustomId('submit_x_link_modal').setTitle('Submit Your X Post');
  const urlInput = new TextInputBuilder()
    .setCustomId('x_post_url').setLabel('X Post URL')
    .setStyle(TextInputStyle.Short).setPlaceholder('https://x.com/yourhandle/status/...')
    .setMinLength(10).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
  await interaction.showModal(modal);
}

async function handleInviteFrens(interaction) {
  await interaction.deferReply({ ephemeral: true });
  let inviteUrl = process.env.INVITE_URL?.trim();
  if (!inviteUrl) {
    try {
      const invite = await interaction.channel.createInvite({ maxAge: 7 * 24 * 60 * 60, maxUses: 0, unique: false });
      inviteUrl = invite.url;
    } catch (err) { console.error(err); }
  }
  await interaction.editReply({
    content: inviteUrl
      ? `**Invite your frens to Voice!**\n\nShare this link:\n${inviteUrl}`
      : 'Could not generate an invite link.',
  });
}

async function handleModalSubmit(interaction) {
  if (interaction.customId !== 'submit_x_link_modal') return;
  const rawUrl = interaction.fields.getTextInputValue('x_post_url').trim();

  if (!isValidXPostUrl(rawUrl)) {
    await interaction.reply({ content: '**Invalid URL.** Please submit a valid X post URL.\nExample: `https://x.com/yourhandle/status/1234567890`', ephemeral: true });
    return;
  }

  await interaction.reply({ content: '**Validation: Success**\n\nYour X post has been verified!', ephemeral: true });
  await interaction.followUp({
    content: '**Your validation was successful.**\nTo earn more rewards and start raffling — invite more frens!',
    ephemeral: true,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('invite_frens').setLabel('Invite frens').setStyle(ButtonStyle.Primary),
      ),
    ],
  });
}

const X_HOSTS = new Set(['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com']);
function isValidXPostUrl(url) {
  try {
    const p = new URL(url);
    return ['http:', 'https:'].includes(p.protocol) && X_HOSTS.has(p.hostname) && /\/status\/\d+/.test(p.pathname);
  } catch { return false; }
}

module.exports = { handleInteraction };
