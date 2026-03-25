const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, getVideoDetails, searchYoutube } = require('../../utils/musicManager');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('songinfo')
    .setDescription('Xem thông tin chi tiết bài hát đang phát hoặc theo URL/tên')
    .addStringOption(o =>
      o.setName('query')
        .setDescription('YouTube URL hoặc tên bài (để trống = bài đang phát)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const g = interaction.guild.id;
    const query = interaction.options.getString('query');
    const queue = getQueue(g);

    let videoId = null;

    if (query) {
      const isUrl = query.includes('youtube.com/watch') || query.includes('youtu.be/');
      if (isUrl) {
        const match = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        videoId = match?.[1] || null;
      } else {
        const song = await searchYoutube(query).catch(() => null);
        if (!song) return interaction.editReply(t(g, 'songinfo_not_found'));
        const m = song.url.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = m?.[1] || null;
      }
    } else {
      if (!queue?.current) return interaction.editReply(t(g, 'songinfo_no_playing'));
      const m = queue.current.url.match(/v=([a-zA-Z0-9_-]{11})/);
      videoId = m?.[1] || null;
    }

    if (!videoId) return interaction.editReply(t(g, 'songinfo_no_id'));

    const details = await getVideoDetails(videoId).catch(() => null);
    if (!details) return interaction.editReply(t(g, 'songinfo_api_fail'));

    const publishedDate = details.publishedAt
      ? `<t:${Math.floor(new Date(details.publishedAt).getTime() / 1000)}:D>`
      : 'N/A';

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setAuthor({ name: '🎵 Song Info', iconURL: 'https://www.youtube.com/favicon.ico' })
      .setTitle(details.title)
      .setURL(details.url)
      .setImage(details.thumbnail);

    embed.addFields(
      { name: t(g, 'songinfo_channel'),   value: `[${details.channel}](${details.channelUrl})`, inline: true },
      { name: t(g, 'songinfo_duration'),  value: details.duration,                               inline: true },
      { name: t(g, 'songinfo_published'), value: publishedDate,                                  inline: true },
    );

    if (details.viewCount) embed.addFields({ name: t(g, 'songinfo_views'), value: details.viewCount, inline: true });
    if (details.likeCount) embed.addFields({ name: t(g, 'songinfo_likes'), value: details.likeCount, inline: true });

    if (details.tags?.length) {
      embed.addFields({ name: t(g, 'songinfo_tags'), value: details.tags.map(tag => `\`${tag}\``).join(' '), inline: false });
    }

    if (details.description) {
      const desc = details.description.length > 300 ? details.description.slice(0, 297) + '...' : details.description;
      embed.addFields({ name: t(g, 'songinfo_description'), value: desc, inline: false });
    }

    embed.setFooter({ text: `ID: ${videoId}` });
    await interaction.editReply({ embeds: [embed] });
  },
};
