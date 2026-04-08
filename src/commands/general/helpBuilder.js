const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');

function buildHelpEmbeds(guildId) {
  const g = guildId;
  const color = 0x5865f2;

  const account = new EmbedBuilder()
    .setTitle(t(g, 'help_title'))
    .setColor(color)
    .setDescription(t(g, 'help_intro'))
    .addFields({
      name: t(g, 'help_section_account'),
      value: [
        t(g, 'help_cmd_login_short'),
        t(g, 'help_cmd_logout_short'),
        t(g, 'help_cmd_info_short'),
        t(g, 'help_cmd_lang_short'),
      ].join('\n'),
    });

  const music = new EmbedBuilder()
    .setColor(color)
    .addFields({
      name: t(g, 'help_section_music'),
      value: [
        t(g, 'help_cmd_play_short'),
        t(g, 'help_cmd_skip_short'),
        t(g, 'help_cmd_stop_short'),
        t(g, 'help_cmd_pause_short'),
        t(g, 'help_cmd_resume_short'),
        t(g, 'help_cmd_queue_short'),
        t(g, 'help_cmd_nowplaying_short'),
        t(g, 'help_cmd_volume_short'),
        t(g, 'help_cmd_loop_short'),
        t(g, 'help_cmd_shuffle_short'),
        t(g, 'help_cmd_lyrics_short'),
        t(g, 'help_cmd_leave_short'),
        t(g, 'help_cmd_songinfo_short'),
      ].join('\n'),
    });

  const fun = new EmbedBuilder()
    .setColor(color)
    .addFields(
      {
        name: t(g, 'help_section_fun'),
        value: [
          t(g, 'help_cmd_fun_hug'),
          t(g, 'help_cmd_fun_kiss'),
          t(g, 'help_cmd_fun_cuddle'),
          t(g, 'help_cmd_fun_8ball'),
          t(g, 'help_cmd_fun_clapify'),
          t(g, 'help_cmd_fun_cuteugly'),
          t(g, 'help_cmd_fun_emojify'),
          t(g, 'help_cmd_fun_rps'),
          t(g, 'help_cmd_fun_rate'),
        ].join('\n'),
      },
      {
        name: t(g, 'help_section_image'),
        value: [
          t(g, 'help_cmd_image_cat'),
          t(g, 'help_cmd_image_dog'),
          t(g, 'help_cmd_image_anime'),
          t(g, 'help_cmd_image_meme'),
        ].join('\n'),
      },
    );

  const rp = new EmbedBuilder()
    .setColor(color)
    .addFields({
      name: t(g, 'help_section_rp'),
      value: [
        t(g, 'help_cmd_rp_list'),
      ].join('\n'),
    });

  const utility = new EmbedBuilder()
    .setColor(color)
    .addFields(
      {
        name: t(g, 'help_section_utility'),
        value: [
          t(g, 'help_cmd_utility_guild'),
          t(g, 'help_cmd_utility_user'),
        ].join('\n'),
      },
      {
        name: t(g, 'help_section_level'),
        value: [
          t(g, 'help_cmd_rank_short'),
          t(g, 'help_cmd_leaderboard_short'),
        ].join('\n'),
      },
      {
        name: t(g, 'help_section_other'),
        value: [
          t(g, 'help_cmd_ping_short'),
          t(g, 'help_cmd_help_short'),
        ].join('\n'),
      },
    );

  const pokemon = new EmbedBuilder()
    .setColor(0xffcb05)
    .addFields(
      {
        name: t(g, 'help_section_poke_start'),
        value: [
          t(g, 'help_cmd_poke_start'),
          t(g, 'help_cmd_poke_catch'),
          t(g, 'help_cmd_poke_profile'),
          t(g, 'help_cmd_poke_list'),
          t(g, 'help_cmd_poke_info'),
          t(g, 'help_cmd_poke_dex'),
        ].join('\n'),
      },
      {
        name: t(g, 'help_section_poke_battle'),
        value: [
          t(g, 'help_cmd_poke_duel'),
          t(g, 'help_cmd_poke_evolve'),
        ].join('\n'),
      },
      {
        name: t(g, 'help_section_poke_economy'),
        value: [
          t(g, 'help_cmd_poke_trade'),
          t(g, 'help_cmd_poke_daily'),
          t(g, 'help_cmd_poke_balance'),
          t(g, 'help_cmd_poke_shop'),
          t(g, 'help_cmd_poke_buy'),
          t(g, 'help_cmd_poke_item'),
        ].join('\n'),
      },
    )
    .setFooter({ text: t(g, 'help_poke_footer') });

  const dnd = new EmbedBuilder()
    .setColor(0x8b0000)
    .addFields({
      name: t(g, 'help_section_dnd'),
      value: [
        t(g, 'help_cmd_dnd_list'),
      ].join('\n'),
    });

  const poker = new EmbedBuilder()
    .setColor(0x1a6b3c)
    .addFields({
      name: t(g, 'help_section_poker'),
      value: [
        t(g, 'help_cmd_poker_start'),
        t(g, 'help_cmd_poker_stop'),
        t(g, 'help_cmd_poker_info'),
        t(g, 'help_cmd_poker_actions'),
      ].join('\n'),
    })
    .setFooter({ text: t(g, 'help_poker_footer') });

  const gd = new EmbedBuilder()
    .setColor(0x7b68ee)
    .addFields({
      name: t(g, 'help_section_gd'),
      value: [
        t(g, 'help_cmd_gd_profile'),
        t(g, 'help_cmd_gd_level'),
        t(g, 'help_cmd_gd_daily'),
        t(g, 'help_cmd_gd_weekly'),
        t(g, 'help_cmd_gd_leaderboard'),
        t(g, 'help_cmd_gd_account'),
        t(g, 'help_cmd_gd_modlist'),
        t(g, 'help_cmd_gd_checkmod'),
        t(g, 'help_cmd_gd_notify'),
      ].join('\n'),
    });

  return [account, music, fun, rp, utility, pokemon, dnd, poker, gd];
}

module.exports = { buildHelpEmbeds };
