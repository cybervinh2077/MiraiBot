const { SlashCommandBuilder } = require('discord.js');
const { isGuildAuthed, setGuildAuth, getGuildAuth } = require('../../utils/guildAuth');

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
      return interaction.reply({ content: `✅ Server đã đăng nhập bởi **${session.discordUsername}** lúc ${new Date(session.linkedAt).toLocaleString('vi-VN')}.`, ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: API_KEY },
        body: JSON.stringify({ action: 'generate-login-link', discordUserId: interaction.user.id, discordUsername: interaction.user.username }),
      });
      const data = await res.json();
      if (!data.loginUrl) return interaction.editReply('❌ Không thể tạo link đăng nhập.');
      await interaction.editReply(`🔗 Truy cập link để liên kết tài khoản MyMirai:\n${data.loginUrl}\n\n⏳ Link có hiệu lực trong 10 phút.`);

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
            setGuildAuth(guildId, { discordUserId: interaction.user.id, discordUsername: interaction.user.username, miraiUsername: result.username || 'Không rõ' });
            await interaction.followUp({ content: `✅ Đăng nhập thành công! Xin chào **${result.username}**!`, ephemeral: true });
          }
        } catch {}
      }, 5000);
      setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
    } catch (err) {
      console.error('Login error:', err);
      await interaction.editReply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
    }
  },
};
