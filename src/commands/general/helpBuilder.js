const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');

/**
 * Build a full help embed for a guild.
 * @param {string} prefix - current guild prefix
 * @param {string} guildId - guild ID for i18n
 * @returns {EmbedBuilder}
 */
function buildHelpEmbed(prefix, guildId) {
  const p = prefix;
  const tr = (key) => t(guildId, key, { p, prefix });

  return new EmbedBuilder()
    .setTitle(tr('help_title'))
    .setColor(0x5865f2)
    .addFields(
      {
        name: tr('help_section_account'),
        value: [
          tr('help_cmd_login'),
          tr('help_cmd_logout'),
          tr('help_cmd_info'),
          tr('help_cmd_prefix'),
          tr('help_cmd_lang'),
        ].join('\n'),
      },
      {
        name: tr('help_section_music'),
        value: [
          tr('help_cmd_play'),
          tr('help_cmd_skip'),
          tr('help_cmd_stop'),
          tr('help_cmd_pause'),
          tr('help_cmd_resume'),
          tr('help_cmd_queue'),
          tr('help_cmd_nowplaying'),
          tr('help_cmd_volume'),
          tr('help_cmd_loop'),
          tr('help_cmd_shuffle'),
          tr('help_cmd_lyrics'),
          tr('help_cmd_leave'),
        ].join('\n'),
      },
      {
        name: tr('help_section_fun'),
        value: [
          tr('help_cmd_hug'),
          tr('help_cmd_kiss'),
          tr('help_cmd_cuddle'),
        ].join('\n'),
      },
      {
        name: tr('help_section_other'),
        value: [
          tr('help_cmd_ping'),
          tr('help_cmd_help'),
        ].join('\n'),
      },
      {
        name: tr('help_section_dnd'),
        value: tr('help_cmd_dnd'),
      },
    )
    .setFooter({ text: tr('help_footer') });
}

module.exports = { buildHelpEmbed };
