const { SlashCommandBuilder } = require('discord.js');
const { getPrefix } = require('../../utils/guildAuth');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiện danh sách lệnh MiraiBot'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const prefix = getPrefix(guildId);
    const helpText = [
      '📖 **MiraiBot Commands**',
      '',
      '**🔐 Account**',
      `\`${prefix}login\` \`/login\` | \`${prefix}logout\` \`/logout\``,
      `\`${prefix}info\` \`/info\` | \`${prefix}prefix\` \`/prefix\``,
      `\`/lang\` — Change language (vn/en/jp)`,
      '',
      '**🎵 Music**',
      `\`${prefix}play\` \`/play\` | \`${prefix}skip\` \`/skip\` | \`${prefix}stop\` \`/stop\``,
      `\`${prefix}pause\` \`/pause\` | \`${prefix}resume\` \`/resume\``,
      `\`${prefix}queue\` \`/queue\` | \`${prefix}nowplaying\` \`/nowplaying\``,
      `\`${prefix}volume\` \`/volume\` | \`${prefix}loop\` \`/loop\` | \`${prefix}shuffle\` \`/shuffle\``,
      `\`${prefix}lyrics\` \`/lyrics\` | \`${prefix}leave\` \`/leave\``,
      '',
      '**🎭 Fun** — `/hug` `/kiss` `/cuddle`',
      '',
      '**🛠️ Other** — `/ping` `/help`',
      '',
      '**🎲 D&D** — `/start-campaign` `/assign-char` `/action` and more',
    ].join('\n');

    try {
      await interaction.user.send(helpText);
      await interaction.reply({ content: t(guildId, 'help_dm_sent'), ephemeral: true });
    } catch {
      await interaction.reply({ content: helpText, ephemeral: true });
    }
  },
};
