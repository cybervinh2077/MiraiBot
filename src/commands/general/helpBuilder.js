const { EmbedBuilder } = require('discord.js');

// Returns array of embeds — one per section, all sent to DM
function buildHelpEmbeds() {
  const color = 0x5865f2;

  const account = new EmbedBuilder()
    .setTitle('📖 MiraiBot — Hướng dẫn sử dụng')
    .setColor(color)
    .setDescription('Bot đa năng cho server MyMirai. Tất cả lệnh đều dùng slash command `/`.')
    .addFields({
      name: '🔐 Tài khoản',
      value: [
        '`/login` — Liên kết tài khoản MyMirai cho server',
        '`/logout` — Hủy liên kết (chỉ người đã đăng nhập)',
        '`/info` — Xem thông tin tài khoản đã liên kết',
        '`/lang <vn|en|jp>` — Đổi ngôn ngữ bot cho server',
      ].join('\n'),
    });

  const music = new EmbedBuilder()
    .setColor(color)
    .addFields({
      name: '🎵 Nhạc',
      value: [
        '`/play <tên/url>` — Phát nhạc hoặc thêm vào queue',
        '`/skip` — Bỏ qua bài hiện tại',
        '`/stop` — Dừng nhạc và xóa queue',
        '`/pause` — Tạm dừng',
        '`/resume` — Tiếp tục phát',
        '`/queue` — Xem danh sách queue',
        '`/nowplaying` — Xem bài đang phát',
        '`/volume <0-200>` — Chỉnh âm lượng',
        '`/loop` — Bật/tắt loop bài hoặc queue',
        '`/shuffle` — Shuffle queue',
        '`/lyrics [tên]` — Lấy lời bài hát đang phát',
        '`/leave` — Bot rời kênh voice',
      ].join('\n'),
    });

  const fun = new EmbedBuilder()
    .setColor(color)
    .addFields(
      {
        name: '🎭 Fun',
        value: [
          '`/fun hug [@user]` — Ôm ai đó',
          '`/fun kiss [@user]` — Hôn ai đó',
          '`/fun cuddle [@user]` — Cuddle với ai đó',
          '`/fun 8ball <câu hỏi>` — Hỏi Magic 8ball',
          '`/fun clapify <text>` — Thêm 👏 vào giữa các từ',
          '`/fun cute-ugly [@user]` — Đánh giá cute hay ugly',
          '`/fun emojify <text>` — Thay từ bằng emoji',
          '`/fun rps <rock|paper|scissors> [@user]` — Oẳn tù xì',
          '`/fun rate dankness|howgay|ppsize|simp|stank|waifu [@user]` — Rate ai đó',
        ].join('\n'),
      },
      {
        name: '🖼️ Image',
        value: [
          '`/image irl cat` — Ảnh mèo ngẫu nhiên',
          '`/image irl dog` — Ảnh chó ngẫu nhiên',
          '`/image anime <kemonomimi|kitsune|megumin|neko|okami|rem|senko|shiro>` — Ảnh anime',
          '`/image meme` — Meme ngẫu nhiên từ Reddit',
        ].join('\n'),
      },
    );

  const rp = new EmbedBuilder()
    .setColor(color)
    .addFields({
      name: '🎮 Roleplay `/rp`',
      value: [
        '`/rp baka @user` — Gọi ai đó là baka',
        '`/rp bite @user` — Cắn ai đó',
        '`/rp blush [@user]` — Đỏ mặt',
        '`/rp cry [@user]` — Khóc',
        '`/rp dance [@user]` — Nhảy',
        '`/rp handholding @user` — Nắm tay',
        '`/rp insult @user` — Xúc phạm',
        '`/rp kill @user` — Giết (roleplay)',
        '`/rp lewd [@user]` — Lewd',
        '`/rp lick @user` — Liếm',
        '`/rp nom @user` — Nom',
        '`/rp pat @user` — Xoa đầu',
        '`/rp poke @user` — Chọc',
        '`/rp pout [@user]` — Phụng phịu',
        '`/rp punch @user` — Đấm',
        '`/rp shrug [@user]` — Nhún vai',
        '`/rp slap @user` — Tát',
        '`/rp sleepy [@user]` — Buồn ngủ',
        '`/rp smug [@user]` — Nhìn đắc ý',
        '`/rp tickle @user` — Cù lét',
      ].join('\n'),
    });

  const utility = new EmbedBuilder()
    .setColor(color)
    .addFields(
      {
        name: '🛠️ Utility',
        value: [
          '`/utility guild info` — Thông tin server',
          '`/utility guild icon` — Icon server',
          '`/utility guild banner` — Banner server',
          '`/utility guild roles` — Danh sách roles',
          '`/utility user info [@user]` — Thông tin người dùng',
          '`/utility user avatar [@user]` — Avatar người dùng',
        ].join('\n'),
      },
      {
        name: '📊 Level',
        value: [
          '`/rank [@user]` — Xem level và XP',
          '`/leaderboard` — Top 10 thành viên tích cực nhất',
        ].join('\n'),
      },
      {
        name: '🛠️ Khác',
        value: [
          '`/ping` — Kiểm tra độ trễ và thông tin hệ thống',
          '`/help` — Hiện hướng dẫn này',
        ].join('\n'),
      },
    );

  const pokemon = new EmbedBuilder()
    .setColor(0xffcb05)
    .addFields(
      {
        name: '🎮 Pokémon — Bắt đầu',
        value: [
          '`/poke start` — Bắt đầu hành trình, nhận Pokémon starter',
          '`/poke catch <tên>` — Bắt Pokémon hoang dã xuất hiện trong kênh',
          '`/poke profile [@user]` — Xem hồ sơ Pokémon',
          '`/poke list [trang]` — Xem bộ sưu tập (20 con/trang)',
          '`/poke info <uid>` — Thông tin chi tiết 1 Pokémon',
          '`/poke dex <tên|số>` — Tra Pokédex',
        ].join('\n'),
      },
      {
        name: '🎮 Pokémon — Chiến đấu & Tiến hoá',
        value: [
          '`/poke duel @user` — Đấu Pokémon với người khác',
          '`/poke evolve <uid>` — Tiến hoá Pokémon',
        ].join('\n'),
      },
      {
        name: '🎮 Pokémon — Trade & Economy',
        value: [
          '`/poke trade start @user <uid của bạn> [uid của họ]` — Đề nghị trade',
          '`/poke trade accept <tradeId>` — Chấp nhận trade',
          '`/poke trade decline <tradeId>` — Từ chối trade',
          '`/poke trade cancel <tradeId>` — Hủy trade của mình',
          '`/poke daily` — Nhận 500 credits mỗi 24h',
          '`/poke balance` — Xem số credits hiện tại',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Pokémon xuất hiện ngẫu nhiên sau mỗi 20–40 tin nhắn trong kênh' });

  const dnd = new EmbedBuilder()
    .setColor(0x8b0000)
    .addFields({
      name: '🎲 D&D — Echoes of the Forgotten Broadcast',
      value: [
        '`/start-campaign` — Bắt đầu campaign',
        '`/assign-char` — Chọn nhân vật',
        '`/action` — Dùng ability của nhân vật',
        '`/stat` — Xem stat block nhân vật hoặc NPC',
        '`/party-status` — Xem trạng thái party',
        '`/quest-log` — Xem danh sách quest',
        '`/complete-quest` — Hoàn thành quest và nhận XP',
        '`/roll-init` — Roll initiative',
        '`/roll-signal` — Toàn party roll signal',
        '`/save-state` — Lưu campaign state',
        '`/load-state` — Load campaign state',
        '`/channel-surf` — Đổi kit và roll initiative',
        '`/solo-start` — Bắt đầu solo campaign',
        '`/solo-next` — Tiến đến lượt tiếp theo',
        '`/solo-auto` — Toggle auto-combat mode',
        '`/solo-quest` — Advance đến quest/channel cụ thể',
      ].join('\n'),
    });

  return [account, music, fun, rp, utility, pokemon, dnd];
}

module.exports = { buildHelpEmbeds };
