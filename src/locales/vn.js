module.exports = {
  // General
  not_logged_in: '⚠️ Bot chưa được đăng nhập cho server này. Dùng lệnh `{prefix}login` để liên kết tài khoản MyMirai.',
  no_permission: '❌ Bạn không có quyền thực hiện lệnh này.',

  // Login/Logout
  already_logged_in: '✅ Server này đã được đăng nhập bởi **{user}** lúc {time}.',
  login_link: '🔗 Để liên kết tài khoản MyMirai cho server này, truy cập:\n{url}\n\n⏳ Link có hiệu lực trong 10 phút.',
  login_failed: '❌ Không thể tạo link đăng nhập. Vui lòng thử lại sau.',
  login_success: '✅ Đăng nhập thành công! Xin chào **{user}**!\nTất cả thành viên trong server **{guild}** giờ có thể dùng bot.',
  login_error: '❌ Có lỗi xảy ra. Vui lòng thử lại sau.',
  logout_not_logged_in: '⚠️ Server này chưa đăng nhập, không có gì để logout.',
  logout_no_permission: '❌ Bạn không có quyền logout. Chỉ **{user}** (người đã đăng nhập) mới có thể thực hiện.',
  logout_success: '👋 Đã logout thành công. Bot sẽ không hoạt động cho đến khi có người dùng `{prefix}login` lại.',

  // Info
  info_title: '📋 **Thông tin tài khoản**',
  info_discord: '👤 Discord: **{user}**',
  info_mirai: '🌐 MyMirai: **{user}**',
  info_linked_at: '🕐 Đăng nhập lúc: **{time}**',
  info_duration: '⏱️ Thời gian đã đăng nhập: **{duration}**',
  info_prefix: '🔧 Prefix hiện tại: `{prefix}`',
  info_not_logged_in: '⚠️ Server chưa đăng nhập. Dùng `/login` để liên kết.',
  duration_days: '{d} ngày ',
  duration_hours: '{h} giờ ',
  duration_minutes: '{m} phút',

  // Prefix
  prefix_invalid: '❌ Prefix không hợp lệ. Tối đa 3 ký tự, ví dụ: `!`, `!!`, `m!`',
  prefix_success: '✅ Đã đổi prefix thành `{prefix}`. Dùng `{prefix}help` để xem lệnh.',
  prefix_no_permission: '❌ Chỉ **{user}** mới có thể đổi prefix.',

  // Lang
  lang_success: '✅ Đã đổi ngôn ngữ bot thành **Tiếng Việt** 🇻🇳',
  lang_invalid: '❌ Ngôn ngữ không hợp lệ. Chọn: `vn`, `en`, `jp`',

  // Music
  music_no_voice: '❌ Bạn cần vào một kênh voice trước.',
  music_searching: '🔍 Đang tìm kiếm: **{query}**...',
  music_no_results: '❌ Không tìm thấy kết quả nào.',
  music_search_title: '🎵 Kết quả tìm kiếm: {query}',
  music_search_footer: 'Tìm thấy trong {ms}ms',
  music_loading: '⏳ Đang tải **{title}**...',
  music_no_song: '❌ Vui lòng nhập tên bài hát hoặc URL.',
  music_added: '🎵 Đã thêm: **{title}** `[{duration}]`',
  music_queued: '✅ Đã thêm vào queue: **{title}** `[{duration}]` — vị trí #{pos}',
  music_no_voice_connect: '❌ Không thể kết nối kênh voice.',
  music_load_fail: '❌ Không thể tải bài hát này.',
  music_skipped: '⏭️ Đã bỏ qua bài hiện tại.',
  music_no_playing: '❌ Không có bài nào đang phát.',
  music_stopped: '⏹️ Đã dừng nhạc và xóa queue.',
  music_not_in_voice: '❌ Bot không ở trong kênh voice.',
  music_paused: '⏸️ Đã tạm dừng.',
  music_already_paused: '⚠️ Nhạc đang bị tạm dừng rồi. Dùng `{prefix}resume` để tiếp tục.',
  music_resumed: '▶️ Tiếp tục phát.',
  music_not_paused: '⚠️ Nhạc không bị tạm dừng.',
  music_volume_invalid: '❌ Volume từ 0 đến 200.',
  music_volume_set: '🔊 Volume: **{vol}%**',
  music_loop_song: '🔂 Loop bài hiện tại: **{state}**',
  music_loop_queue: '🔁 Loop queue: **{state}**',
  music_loop_on: 'BẬT',
  music_loop_off: 'TẮT',
  music_shuffle_done: '🔀 Đã shuffle queue.',
  music_queue_empty: '❌ Queue trống.',
  music_remove_invalid: '❌ Vị trí không hợp lệ. Queue có **{count}** bài.',
  music_removed: '🗑️ Đã xóa: **{title}**',
  music_cleared: '🗑️ Đã xóa toàn bộ queue.',
  music_left: '👋 Đã rời kênh voice.',
  music_idle: '⏹️ Không có bài nào được thêm trong 1 phút. Bot đã rời kênh voice.',
  music_queue_end: '✅ Queue đã hết bài. Bot sẽ tự rời sau 1 phút nếu không có bài mới.',
  music_play_error: '❌ Không thể phát **{title}** (có thể do bản quyền hoặc bị chặn), bỏ qua...',
  music_now_playing: '🎵 **Đang phát:** {title} `[{duration}]`',
  music_select_placeholder: 'Chọn bài hát...',
  music_timeout: '⏰ Hết thời gian chọn bài.',
  music_queue_header: '▶️ **Đang phát:** {title} `[{duration}]`',
  music_queue_list: '**Queue:**',
  music_queue_more: '... và **{count}** bài nữa',
  music_queue_none: '📭 Không có bài nào trong queue.',
  music_jump_invalid: '❌ Vị trí không hợp lệ. Queue có **{count}** bài.',
  music_jumped: '⏩ Nhảy đến bài #{pos}: **{title}**',

  // Lyrics
  lyrics_searching: '🔍 Đang tìm lời bài: **{title}**...',
  lyrics_not_found: '❌ Không tìm thấy lời bài **{title}**.',
  lyrics_no_playing: '❌ Không có bài nào đang phát. Dùng `{prefix}lyrics <tên bài>` để tìm.',
  lyrics_footer: 'Trang {page}/{total}',
  lyrics_footer_single: 'MiraiBot Lyrics',

  // Fun
  fun_cooldown: '⏳ Chờ **{sec}s** nữa nhé!',
  hug_self: '**{user}** tự ôm bản thân... 🥺',
  hug_other: '**{user}** ôm **{target}**! 🤗',
  kiss_self: '**{user}** thổi nụ hôn gió~ 💋',
  kiss_other: '**{user}** hôn **{target}**! 💋',
  cuddle_self: '**{user}** cuộn tròn một mình... 🥺',
  cuddle_other: '**{user}** cuddle với **{target}**! 🥰',

  // Help
  help_dm_sent: '📬 Đã gửi danh sách lệnh vào DM của bạn!',
  help_title: '📖 MiraiBot — Danh sách lệnh',
  help_footer: 'Prefix hiện tại: {prefix} | Dùng /help hoặc {prefix}help để xem lại',
  help_section_account: '🔐 Tài khoản',
  help_section_music: '🎵 Nhạc',
  help_section_fun: '🎭 Fun',
  help_section_other: '🛠️ Khác',
  help_section_dnd: '🎲 D&D',
  help_cmd_login: '`{p}login` `/login` — Liên kết tài khoản MyMirai cho server',
  help_cmd_logout: '`{p}logout` `/logout` — Hủy liên kết (chỉ người đã đăng nhập)',
  help_cmd_info: '`{p}info` `/info` — Xem thông tin tài khoản đã liên kết',
  help_cmd_prefix: '`{p}prefix <ký_tự>` `/prefix` — Đổi prefix lệnh',
  help_cmd_lang: '`/lang <vn|en|jp>` — Đổi ngôn ngữ bot cho server',
  help_cmd_play: '`{p}play <tên/url>` `/play` — Phát nhạc hoặc thêm vào queue',
  help_cmd_skip: '`{p}skip` `/skip` — Bỏ qua bài hiện tại',
  help_cmd_stop: '`{p}stop` `/stop` — Dừng nhạc và xóa queue',
  help_cmd_pause: '`{p}pause` `/pause` — Tạm dừng nhạc',
  help_cmd_resume: '`{p}resume` `/resume` — Tiếp tục phát',
  help_cmd_queue: '`{p}queue` `/queue` — Xem danh sách queue',
  help_cmd_nowplaying: '`{p}nowplaying` `/nowplaying` — Xem bài đang phát',
  help_cmd_volume: '`{p}volume <0-200>` `/volume` — Chỉnh âm lượng',
  help_cmd_loop: '`{p}loop` `/loop` — Bật/tắt loop bài hoặc queue',
  help_cmd_shuffle: '`{p}shuffle` `/shuffle` — Shuffle queue',
  help_cmd_lyrics: '`{p}lyrics [tên]` `/lyrics` — Lấy lời bài hát đang phát',
  help_cmd_leave: '`{p}leave` `/leave` — Bot rời kênh voice',
  help_cmd_hug: '`/hug [@user]` — Ôm ai đó (hoặc tự ôm)',
  help_cmd_kiss: '`/kiss [@user]` — Hôn ai đó (hoặc tự hôn gió)',
  help_cmd_cuddle: '`/cuddle [@user]` — Cuddle với ai đó',
  help_cmd_ping: '`{p}ping` `/ping` — Kiểm tra độ trễ và thông tin bot',
  help_cmd_help: '`{p}help` `/help` — Hiện danh sách lệnh này',
  help_cmd_dnd: '`/start-campaign` `/assign-char` `/action` `/stat` `/party-status` `/quest-log` `/roll-init` và nhiều hơn nữa',

  // Ping
  ping_title: '🏓 Pong!',
  ping_api_latency: '📡 API Latency',
  ping_websocket: '🔌 WebSocket',
  ping_uptime: '⏱️ Uptime',
  ping_cpu: '🖥️ CPU',
  ping_temp: '🌡️ Nhiệt độ',
  ping_load: '📊 Load avg',
  ping_ram: '💾 RAM',
  ping_commit: '📦 Commit',

  // General errors
  error_generic: '❌ Có lỗi xảy ra. Thử lại sau nhé!',
  error_cooldown: '⏳ Chờ **{sec}s** nữa nhé!',

  // Info command
  info_no_login: '⚠️ Server chưa đăng nhập. Dùng `/login` để liên kết.',

  // Login
  login_already: '✅ Server đã đăng nhập bởi **{user}** lúc {time}.',
  login_no_url: '❌ Không thể tạo link đăng nhập.',
  login_prompt: '🔗 Truy cập link để liên kết tài khoản MyMirai:\n{url}\n\n⏳ Link có hiệu lực trong 10 phút.',
  login_done: '✅ Đăng nhập thành công! Xin chào **{user}**!',

  // Logout
  logout_only_owner: '❌ Chỉ **{user}** mới có thể logout.',
  logout_done: '👋 Đã logout thành công.',

  // Prefix
  prefix_max_len: '❌ Prefix tối đa 3 ký tự.',
  prefix_changed: '✅ Đã đổi prefix thành `{prefix}`.',
  prefix_only_owner: '❌ Chỉ **{user}** mới có thể đổi prefix.',

  // Rank / Leaderboard
  rank_title: "Rank của {user}",
  rank_level: '🏆 Level',
  rank_xp: '✨ XP',
  rank_xp_next: '📈 XP để lên level',
  rank_footer: 'XP cần cho level {level}: {required}',
  leaderboard_empty: '📭 Chưa có dữ liệu level cho server này.',
  leaderboard_title: '🏆 {guild} — Bảng xếp hạng',
  leaderboard_footer: 'Top {count} thành viên',

  // Songinfo
  songinfo_not_found: '❌ Không tìm thấy bài hát.',
  songinfo_no_playing: '❌ Không có bài nào đang phát. Dùng `/songinfo <tên>` để tìm kiếm.',
  songinfo_no_id: '❌ Không thể lấy thông tin bài hát này.',
  songinfo_api_fail: '❌ Không thể tải thông tin từ YouTube API.',
  songinfo_channel: '👤 Kênh',
  songinfo_duration: '⏱ Thời lượng',
  songinfo_published: '📅 Ngày đăng',
  songinfo_views: '👁 Lượt xem',
  songinfo_likes: '👍 Lượt thích',
  songinfo_tags: '🏷 Tags',
  songinfo_description: '📝 Mô tả',

  // Image
  image_cat_title: '🐱 Mèo ngẫu nhiên',
  image_dog_title: '🐶 Chó ngẫu nhiên',
  image_anime_title: '✨ Anime {name}',
  image_meme_title: '😂 Meme ngẫu nhiên',
  image_error: '❌ Đã xảy ra lỗi, vui lòng thử lại sau.',

  // RP
  rp_need_target: '❌ Bạn cần mention một người dùng cho lệnh này.',
  rp_error: '❌ Có lỗi xảy ra, thử lại sau nhé!',

  // Utility
  utility_no_icon: '❌ Server này không có icon.',
  utility_no_banner: '❌ Server này không có banner.',
  utility_no_roles: 'Không có role nào.',
  utility_error: '❌ Đã xảy ra lỗi khi xử lý lệnh, thử lại sau.',
  utility_guild_info_footer: 'Thông tin Server',
  utility_user_info_footer: 'Thông tin Người dùng',
  utility_bot_yes: 'Có',
  utility_bot_no: 'Không',
};
