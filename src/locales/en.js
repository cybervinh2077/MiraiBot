module.exports = {
  // General
  not_logged_in: '⚠️ This server is not logged in. Use `{prefix}login` to link a MyMirai account.',
  no_permission: '❌ You do not have permission to use this command.',

  // Login/Logout
  already_logged_in: '✅ This server is already logged in by **{user}** at {time}.',
  login_link: '🔗 To link your MyMirai account for this server, visit:\n{url}\n\n⏳ Link expires in 10 minutes.',
  login_failed: '❌ Could not generate login link. Please try again later.',
  login_success: '✅ Login successful! Welcome **{user}**!\nAll members in **{guild}** can now use the bot.',
  login_error: '❌ An error occurred. Please try again later.',
  logout_not_logged_in: '⚠️ This server is not logged in, nothing to logout.',
  logout_no_permission: '❌ You cannot logout. Only **{user}** (who logged in) can do this.',
  logout_success: '👋 Logged out successfully. Use `{prefix}login` to log in again.',

  // Info
  info_title: '📋 **Account Info**',
  info_discord: '👤 Discord: **{user}**',
  info_mirai: '🌐 MyMirai: **{user}**',
  info_linked_at: '🕐 Logged in at: **{time}**',
  info_duration: '⏱️ Session duration: **{duration}**',
  info_prefix: '🔧 Current prefix: `{prefix}`',
  info_not_logged_in: '⚠️ Server not logged in. Use `/login` to link.',
  duration_days: '{d}d ',
  duration_hours: '{h}h ',
  duration_minutes: '{m}m',

  // Prefix
  prefix_invalid: '❌ Invalid prefix. Max 3 characters, e.g. `!`, `!!`, `m!`',
  prefix_success: '✅ Prefix changed to `{prefix}`. Use `{prefix}help` to see commands.',
  prefix_no_permission: '❌ Only **{user}** can change the prefix.',

  // Lang
  lang_success: '✅ Bot language set to **English** 🇬🇧',
  lang_invalid: '❌ Invalid language. Choose: `vn`, `en`, `jp`',

  // Music
  music_no_voice: '❌ You need to join a voice channel first.',
  music_searching: '🔍 Searching: **{query}**...',
  music_no_results: '❌ No results found.',
  music_search_title: '🎵 Search results: {query}',
  music_search_footer: 'Found in {ms}ms',
  music_loading: '⏳ Loading **{title}**...',
  music_no_song: '❌ Please enter a song name or URL.',
  music_added: '🎵 Added: **{title}** `[{duration}]`',
  music_queued: '✅ Added to queue: **{title}** `[{duration}]` — position #{pos}',
  music_no_voice_connect: '❌ Cannot connect to voice channel.',
  music_load_fail: '❌ Cannot load this song.',
  music_skipped: '⏭️ Skipped current song.',
  music_no_playing: '❌ Nothing is playing.',
  music_stopped: '⏹️ Stopped and cleared queue.',
  music_not_in_voice: '❌ Bot is not in a voice channel.',
  music_paused: '⏸️ Paused.',
  music_already_paused: '⚠️ Already paused. Use `{prefix}resume` to continue.',
  music_resumed: '▶️ Resumed.',
  music_not_paused: '⚠️ Music is not paused.',
  music_volume_invalid: '❌ Volume must be between 0 and 200.',
  music_volume_set: '🔊 Volume: **{vol}%**',
  music_loop_song: '🔂 Loop current song: **{state}**',
  music_loop_queue: '🔁 Loop queue: **{state}**',
  music_loop_on: 'ON',
  music_loop_off: 'OFF',
  music_shuffle_done: '🔀 Queue shuffled.',
  music_queue_empty: '❌ Queue is empty.',
  music_remove_invalid: '❌ Invalid position. Queue has **{count}** songs.',
  music_removed: '🗑️ Removed: **{title}**',
  music_cleared: '🗑️ Queue cleared.',
  music_left: '👋 Left voice channel.',
  music_idle: '⏹️ No songs added for 1 minute. Bot left the voice channel.',
  music_queue_end: '✅ Queue ended. Bot will leave in 1 minute if no new songs are added.',
  music_play_error: '❌ Cannot play **{title}** (may be restricted), skipping...',
  music_now_playing: '🎵 **Now playing:** {title} `[{duration}]`',
  music_select_placeholder: 'Select a song...',
  music_timeout: '⏰ Selection timed out.',
  music_queue_header: '▶️ **Now playing:** {title} `[{duration}]`',
  music_queue_list: '**Queue:**',
  music_queue_more: '... and **{count}** more',
  music_queue_none: '📭 No songs in queue.',
  music_jump_invalid: '❌ Invalid position. Queue has **{count}** songs.',
  music_jumped: '⏩ Jumped to #{pos}: **{title}**',

  // Lyrics
  lyrics_searching: '🔍 Searching lyrics for: **{title}**...',
  lyrics_not_found: '❌ Lyrics not found for **{title}**.',
  lyrics_no_playing: '❌ Nothing is playing. Use `{prefix}lyrics <title>` to search.',
  lyrics_footer: 'Page {page}/{total}',
  lyrics_footer_single: 'MiraiBot Lyrics',

  // Fun
  fun_cooldown: '⏳ Wait **{sec}s** before using this again!',
  hug_self: '**{user}** hugs themselves... 🥺',
  hug_other: '**{user}** hugs **{target}**! 🤗',
  kiss_self: '**{user}** blows a kiss~ 💋',
  kiss_other: '**{user}** kisses **{target}**! 💋',
  cuddle_self: '**{user}** cuddles alone... 🥺',
  cuddle_other: '**{user}** cuddles with **{target}**! 🥰',

  // Help
  help_dm_sent: '📬 Help has been sent to your DMs!',
  help_title: '📖 MiraiBot — Command List',
  help_footer: 'Current prefix: {prefix} | Use /help or {prefix}help to view again',
  help_section_account: '🔐 Account',
  help_section_music: '🎵 Music',
  help_section_fun: '🎭 Fun',
  help_section_other: '🛠️ Other',
  help_section_dnd: '🎲 D&D',
  help_cmd_login: '`{p}login` `/login` — Link a MyMirai account for this server',
  help_cmd_logout: '`{p}logout` `/logout` — Unlink account (only the logged-in user)',
  help_cmd_info: '`{p}info` `/info` — View linked account info',
  help_cmd_prefix: '`{p}prefix <char>` `/prefix` — Change command prefix',
  help_cmd_lang: '`/lang <vn|en|jp>` — Change bot language for this server',
  help_cmd_play: '`{p}play <name/url>` `/play` — Play a song or add to queue',
  help_cmd_skip: '`{p}skip` `/skip` — Skip current song',
  help_cmd_stop: '`{p}stop` `/stop` — Stop music and clear queue',
  help_cmd_pause: '`{p}pause` `/pause` — Pause playback',
  help_cmd_resume: '`{p}resume` `/resume` — Resume playback',
  help_cmd_queue: '`{p}queue` `/queue` — View the queue',
  help_cmd_nowplaying: '`{p}nowplaying` `/nowplaying` — View current song',
  help_cmd_volume: '`{p}volume <0-200>` `/volume` — Set volume',
  help_cmd_loop: '`{p}loop` `/loop` — Toggle loop (song or queue)',
  help_cmd_shuffle: '`{p}shuffle` `/shuffle` — Shuffle the queue',
  help_cmd_lyrics: '`{p}lyrics [title]` `/lyrics` — Get lyrics for current or named song',
  help_cmd_leave: '`{p}leave` `/leave` — Bot leaves voice channel',
  help_cmd_hug: '`/hug [@user]` — Hug someone (or yourself)',
  help_cmd_kiss: '`/kiss [@user]` — Kiss someone (or blow a kiss)',
  help_cmd_cuddle: '`/cuddle [@user]` — Cuddle with someone',
  help_cmd_ping: '`{p}ping` `/ping` — Check latency and bot info',
  help_cmd_help: '`{p}help` `/help` — Show this command list',
  help_cmd_dnd: '`/start-campaign` `/assign-char` `/action` `/stat` `/party-status` `/quest-log` `/roll-init` and more',

  // Ping
  ping_title: '🏓 Pong!',
  ping_api_latency: '📡 API Latency',
  ping_websocket: '🔌 WebSocket',
  ping_uptime: '⏱️ Uptime',
  ping_cpu: '🖥️ CPU',
  ping_temp: '🌡️ Temp',
  ping_load: '📊 Load avg',
  ping_ram: '💾 RAM',
  ping_commit: '📦 Commit',

  // General errors
  error_generic: '❌ An error occurred. Please try again.',
  error_cooldown: '⏳ Wait **{sec}s** before using this again!',

  // Info command
  info_no_login: '⚠️ Server not logged in. Use `/login` to link.',

  // Login
  login_already: '✅ Server already logged in by **{user}** at {time}.',
  login_no_url: '❌ Could not generate login link.',
  login_prompt: '🔗 Visit the link to link your MyMirai account:\n{url}\n\n⏳ Link expires in 10 minutes.',
  login_done: '✅ Login successful! Welcome **{user}**!',

  // Logout
  logout_only_owner: '❌ Only **{user}** can logout.',
  logout_done: '👋 Logged out successfully.',

  // Prefix
  prefix_max_len: '❌ Prefix max 3 characters.',
  prefix_changed: '✅ Prefix changed to `{prefix}`.',
  prefix_only_owner: '❌ Only **{user}** can change the prefix.',

  // Rank / Leaderboard
  rank_title: "{user}'s Rank",
  rank_level: '🏆 Level',
  rank_xp: '✨ XP',
  rank_xp_next: '📈 XP to next level',
  rank_footer: 'XP needed for level {level}: {required}',
  leaderboard_empty: '📭 No level data for this server yet.',
  leaderboard_title: '🏆 {guild} — Leaderboard',
  leaderboard_footer: 'Top {count} members',

  // Songinfo
  songinfo_not_found: '❌ Song not found.',
  songinfo_no_playing: '❌ Nothing is playing. Use `/songinfo <name>` to search.',
  songinfo_no_id: '❌ Cannot get song info.',
  songinfo_api_fail: '❌ Cannot load info from YouTube API.',
  songinfo_channel: '👤 Channel',
  songinfo_duration: '⏱ Duration',
  songinfo_published: '📅 Published',
  songinfo_views: '👁 Views',
  songinfo_likes: '👍 Likes',
  songinfo_tags: '🏷 Tags',
  songinfo_description: '📝 Description',

  // Image
  image_cat_title: '🐱 Random Cat',
  image_dog_title: '🐶 Random Dog',
  image_anime_title: '✨ Random Anime {name}',
  image_meme_title: '😂 Random Meme',
  image_error: '❌ An error occurred, please try again.',

  // RP
  rp_need_target: '❌ You need to mention a user for this command.',
  rp_error: '❌ An error occurred, please try again.',

  // Utility
  utility_no_icon: '❌ This server has no icon.',
  utility_no_banner: '❌ This server has no banner.',
  utility_no_roles: 'No roles.',
  utility_error: '❌ An error occurred, please try again.',
  utility_guild_info_footer: 'Guild Info',
  utility_user_info_footer: 'User Info',
  utility_bot_yes: 'Yes',
  utility_bot_no: 'No',
};
