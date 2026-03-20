const { SlashCommandBuilder } = require('discord.js');
const { getGuildAuth, setGuildLang } = require('../../utils/guildAuth');
const { t, VALID_LANGS } = require('../../utils/i18n');

const LANG_NAMES = { vn: 'Tiếng Việt 🇻🇳', en: 'English 🇬🇧', jp: '日本語 🇯🇵' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lang')
    .setDescription('Change bot language / Đổi ngôn ngữ bot / 言語を変更')
    .addStringOption(opt =>
      opt.setName('language')
        .setDescription('vn = Tiếng Việt | en = English | jp = 日本語')
        .setRequired(true)
        .addChoices(
          { name: 'Tiếng Việt 🇻🇳', value: 'vn' },
          { name: 'English 🇬🇧', value: 'en' },
          { name: '日本語 🇯🇵', value: 'jp' },
        )
    ),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const session = getGuildAuth(guildId);

    if (interaction.user.id !== session?.discordUserId) {
      return interaction.reply({
        content: t(guildId, 'prefix_no_permission', { user: session?.discordUsername || '?' }),
        ephemeral: true,
      });
    }

    const lang = interaction.options.getString('language');
    if (!VALID_LANGS.includes(lang)) {
      return interaction.reply({ content: t(guildId, 'lang_invalid'), ephemeral: true });
    }

    setGuildLang(guildId, lang);
    interaction.reply({ content: t(guildId, 'lang_success'), ephemeral: false });
  },
};
