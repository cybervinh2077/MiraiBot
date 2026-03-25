const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, getVideoDetails, searchYoutube } = require('../../utils/musicManager');

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

    const query = interaction.options.getString('query');
    const queue = getQueue(interaction.guild.id);

    let videoId = null;
    let sourceUrl = null;

    if (query) {
      // Resolve từ URL hoặc search
      const isUrl = query.includes('youtube.com/watch') || query.includes('youtu.be/');
      if (isUrl) {
        const match = query.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        videoId = match?.[1] || null;
        sourceUrl = query;
      } else {
        // Search YouTube lấy bài đầu tiên
        const song = await searchYoutube(query).catch(() => null);
        if (!song) return interaction.editReply('❌ Không tìm thấy bài hát.');
        const m = song.url.match(/v=([a-zA-Z0-9_-]{11})/);
        videoId = m?.[1] || null;
        sourceUrl = song.url;
      }
    } else {
      // Dùng bài đang phát
      if (!queue?.current) return interaction.editReply('❌ Không có bài nào đang phát. Dùng `/songinfo <tên>` để tìm kiếm.');
      const m = queue.current.url.match(/v=([a-zA-Z0-9_-]{11})/);
      videoId = m?.[1] || null;
      sourceUrl = queue.current.url;
    }

    if (!videoId) return interaction.editReply('❌ Không thể lấy thông tin bài hát này.');

    const details = await getVideoDetails(videoId).catch(() => null);
    if (!details) return interaction.editReply('❌ Không thể tải thông tin từ YouTube API.');

    // Format published date
    const publishedDate = details.publishedAt
      ? `<t:${Math.floor(new Date(details.publishedAt).getTime() / 1000)}:D>`
      : 'N/A';

    const embed = new EmbedBuilder()
      .setColor(0xFF0000) // YouTube red
      .setAuthor({ name: '🎵 Song Info', iconURL: 'https://www.youtube.com/favicon.ico' })
      .setTitle(details.title)
      .setURL(details.url)
      .setImage(details.thumbnail);

    embed.addFields(
      { name: '👤 Channel',    value: `[${details.channel}](${details.channelUrl})`, inline: true },
      { name: '⏱ Duration',   value: details.duration,                               inline: true },
      { name: '📅 Published',  value: publishedDate,                                  inline: true },
    );

    if (details.viewCount) embed.addFields({ name: '👁 Views',  value: details.viewCount, inline: true });
    if (details.likeCount) embed.addFields({ name: '👍 Likes',  value: details.likeCount, inline: true });

    if (details.tags?.length) {
      embed.addFields({ name: '🏷 Tags', value: details.tags.map(t => `\`${t}\``).join(' '), inline: false });
    }

    if (details.description) {
      const desc = details.description.length > 300
        ? details.description.slice(0, 297) + '...'
        : details.description;
      embed.addFields({ name: '📝 Description', value: desc, inline: false });
    }

    embed.setFooter({ text: `ID: ${videoId}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
