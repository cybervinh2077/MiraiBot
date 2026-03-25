const { SlashCommandBuilder } = require('discord.js');
const { isGuildAuthed, setGuildAuth, getGuildAuth } = require('../../utils/guildAuth');
const { t } = require('../../utils/i18n');

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('login')
    .setDescription('Liên kết tài khoản MyMirai cho server'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    if (isGuildAuthed(guildId)) {
      const session = getGuildAuth(guildId);
      return interaction.reply({ content: t(guildId, 'login_already', { user: session.discordUsername, time: new Date(session.linkedAt).toLocaleString('vi-VN') }), ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: API_KEY },
        body: JSON.stringify({ action: 'generate-login-link', discordUserId: interaction.user.id, discordUsername: interaction.user.username }),
      });
      const data = await res.json();
      if (!data.loginUrl) return interaction.editReply(t(guildId, 'login_no_url'));
      await interaction.editReply(t(guildId, 'login_prompt', { url: data.loginUrl }));

      const interval = setInterval(async () => {
        try {
          const check = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: API_KEY },
            body: JSON.stringify({ action: 'check-login-status', state: data.state }),
          });
          const result = await check.json();
          if (result.status === 'completed') {
            clearInterval(interval);
            setGuildAuth(guildId, { discordUserId: interaction.user.id, discordUsername: interaction.user.username, miraiUsername: result.username || '?' });
            await interaction.followUp({ content: t(guildId, 'login_done', { user: result.username }), ephemeral: true });
          }
        } catch {}
      }, 5000);
      setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
    } catch (err) {
      console.error('Login error:', err);
      await interaction.editReply(t(guildId, 'login_error'));
    }
  },
};
