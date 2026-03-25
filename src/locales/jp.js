module.exports = {
  // General
  not_logged_in: '⚠️ このサーバーはまだログインしていません。`{prefix}login` でMyMiraiアカウントを連携してください。',
  no_permission: '❌ このコマンドを使用する権限がありません。',

  // Login/Logout
  already_logged_in: '✅ このサーバーは **{user}** が {time} にログイン済みです。',
  login_link: '🔗 MyMiraiアカウントを連携するには、こちらにアクセスしてください:\n{url}\n\n⏳ リンクは10分間有効です。',
  login_failed: '❌ ログインリンクを生成できませんでした。後でもう一度お試しください。',
  login_success: '✅ ログイン成功！ようこそ **{user}** さん！\n**{guild}** の全メンバーがボットを使えるようになりました。',
  login_error: '❌ エラーが発生しました。後でもう一度お試しください。',
  logout_not_logged_in: '⚠️ このサーバーはログインしていません。',
  logout_no_permission: '❌ ログアウトできません。**{user}**（ログインした人）のみ実行できます。',
  logout_success: '👋 ログアウトしました。`{prefix}login` で再ログインできます。',

  // Info
  info_title: '📋 **アカウント情報**',
  info_discord: '👤 Discord: **{user}**',
  info_mirai: '🌐 MyMirai: **{user}**',
  info_linked_at: '🕐 ログイン日時: **{time}**',
  info_duration: '⏱️ ログイン時間: **{duration}**',
  info_prefix: '🔧 現在のプレフィックス: `{prefix}`',
  info_not_logged_in: '⚠️ サーバーがログインしていません。`/login` で連携してください。',
  duration_days: '{d}日 ',
  duration_hours: '{h}時間 ',
  duration_minutes: '{m}分',

  // Prefix
  prefix_invalid: '❌ 無効なプレフィックスです。最大3文字（例: `!`, `!!`, `m!`）',
  prefix_success: '✅ プレフィックスを `{prefix}` に変更しました。`{prefix}help` でコマンド一覧を確認できます。',
  prefix_no_permission: '❌ **{user}** のみプレフィックスを変更できます。',

  // Lang
  lang_success: '✅ ボットの言語を**日本語** 🇯🇵 に設定しました。',
  lang_invalid: '❌ 無効な言語です。`vn`、`en`、`jp` から選んでください。',

  // Music
  music_no_voice: '❌ まずボイスチャンネルに参加してください。',
  music_searching: '🔍 検索中: **{query}**...',
  music_no_results: '❌ 結果が見つかりませんでした。',
  music_search_title: '🎵 検索結果: {query}',
  music_search_footer: '{ms}msで見つかりました',
  music_loading: '⏳ **{title}** を読み込み中...',
  music_no_song: '❌ 曲名またはURLを入力してください。',
  music_added: '🎵 追加しました: **{title}** `[{duration}]`',
  music_queued: '✅ キューに追加: **{title}** `[{duration}]` — #{pos}番目',
  music_no_voice_connect: '❌ ボイスチャンネルに接続できません。',
  music_load_fail: '❌ この曲を読み込めません。',
  music_skipped: '⏭️ スキップしました。',
  music_no_playing: '❌ 再生中の曲がありません。',
  music_stopped: '⏹️ 停止してキューをクリアしました。',
  music_not_in_voice: '❌ ボットはボイスチャンネルにいません。',
  music_paused: '⏸️ 一時停止しました。',
  music_already_paused: '⚠️ すでに一時停止中です。`{prefix}resume` で再開できます。',
  music_resumed: '▶️ 再開しました。',
  music_not_paused: '⚠️ 一時停止していません。',
  music_volume_invalid: '❌ 音量は0〜200の間で指定してください。',
  music_volume_set: '🔊 音量: **{vol}%**',
  music_loop_song: '🔂 現在の曲をループ: **{state}**',
  music_loop_queue: '🔁 キューをループ: **{state}**',
  music_loop_on: 'オン',
  music_loop_off: 'オフ',
  music_shuffle_done: '🔀 キューをシャッフルしました。',
  music_queue_empty: '❌ キューが空です。',
  music_remove_invalid: '❌ 無効な位置です。キューには **{count}** 曲あります。',
  music_removed: '🗑️ 削除しました: **{title}**',
  music_cleared: '🗑️ キューをクリアしました。',
  music_left: '👋 ボイスチャンネルから退出しました。',
  music_idle: '⏹️ 1分間曲が追加されませんでした。ボットが退出しました。',
  music_queue_end: '✅ キューが終了しました。1分後に自動退出します。',
  music_play_error: '❌ **{title}** を再生できません（著作権等の理由）、スキップします...',
  music_now_playing: '🎵 **再生中:** {title} `[{duration}]`',
  music_select_placeholder: '曲を選んでください...',
  music_timeout: '⏰ 選択がタイムアウトしました。',
  music_queue_header: '▶️ **再生中:** {title} `[{duration}]`',
  music_queue_list: '**キュー:**',
  music_queue_more: '... あと **{count}** 曲',
  music_queue_none: '📭 キューに曲がありません。',
  music_jump_invalid: '❌ 無効な位置です。キューには **{count}** 曲あります。',
  music_jumped: '⏩ #{pos}番目にジャンプ: **{title}**',

  // Lyrics
  lyrics_searching: '🔍 歌詞を検索中: **{title}**...',
  lyrics_not_found: '❌ **{title}** の歌詞が見つかりませんでした。',
  lyrics_no_playing: '❌ 再生中の曲がありません。`{prefix}lyrics <曲名>` で検索できます。',
  lyrics_footer: '{page}/{total} ページ',
  lyrics_footer_single: 'MiraiBot Lyrics',

  // Fun
  fun_cooldown: '⏳ あと **{sec}秒** 待ってください！',
  hug_self: '**{user}** が自分を抱きしめた... 🥺',
  hug_other: '**{user}** が **{target}** を抱きしめた！ 🤗',
  kiss_self: '**{user}** がエアキスを送った~ 💋',
  kiss_other: '**{user}** が **{target}** にキスした！ 💋',
  cuddle_self: '**{user}** が一人でくっついた... 🥺',
  cuddle_other: '**{user}** が **{target}** とくっついた！ 🥰',

  // Help
  help_dm_sent: '📬 コマンド一覧をDMに送りました！',
  help_title: '📖 MiraiBot — コマンド一覧',
  help_footer: '現在のプレフィックス: {prefix} | /help または {prefix}help で再表示',
  help_section_account: '🔐 アカウント',
  help_section_music: '🎵 音楽',
  help_section_fun: '🎭 ファン',
  help_section_other: '🛠️ その他',
  help_section_dnd: '🎲 D&D',
  help_cmd_login: '`{p}login` `/login` — MyMiraiアカウントをサーバーに連携',
  help_cmd_logout: '`{p}logout` `/logout` — 連携解除（ログインした人のみ）',
  help_cmd_info: '`{p}info` `/info` — 連携アカウント情報を表示',
  help_cmd_prefix: '`{p}prefix <文字>` `/prefix` — コマンドプレフィックスを変更',
  help_cmd_lang: '`/lang <vn|en|jp>` — ボットの言語を変更',
  help_cmd_play: '`{p}play <名前/URL>` `/play` — 曲を再生またはキューに追加',
  help_cmd_skip: '`{p}skip` `/skip` — 現在の曲をスキップ',
  help_cmd_stop: '`{p}stop` `/stop` — 音楽を停止してキューをクリア',
  help_cmd_pause: '`{p}pause` `/pause` — 一時停止',
  help_cmd_resume: '`{p}resume` `/resume` — 再開',
  help_cmd_queue: '`{p}queue` `/queue` — キューを表示',
  help_cmd_nowplaying: '`{p}nowplaying` `/nowplaying` — 再生中の曲を表示',
  help_cmd_volume: '`{p}volume <0-200>` `/volume` — 音量を設定',
  help_cmd_loop: '`{p}loop` `/loop` — ループ切り替え（曲またはキュー）',
  help_cmd_shuffle: '`{p}shuffle` `/shuffle` — キューをシャッフル',
  help_cmd_lyrics: '`{p}lyrics [曲名]` `/lyrics` — 歌詞を取得',
  help_cmd_leave: '`{p}leave` `/leave` — ボットがボイスチャンネルから退出',
  help_cmd_hug: '`/hug [@user]` — 誰かを抱きしめる',
  help_cmd_kiss: '`/kiss [@user]` — 誰かにキスする',
  help_cmd_cuddle: '`/cuddle [@user]` — 誰かとくっつく',
  help_cmd_ping: '`{p}ping` `/ping` — 遅延とボット情報を確認',
  help_cmd_help: '`{p}help` `/help` — このコマンド一覧を表示',
  help_cmd_dnd: '`/start-campaign` `/assign-char` `/action` `/stat` `/party-status` `/quest-log` `/roll-init` など',

  // Ping
  ping_title: '🏓 Pong!',
  ping_api_latency: '📡 APIレイテンシ',
  ping_websocket: '🔌 WebSocket',
  ping_uptime: '⏱️ 稼働時間',
  ping_cpu: '🖥️ CPU',
  ping_temp: '🌡️ 温度',
  ping_load: '📊 負荷平均',
  ping_ram: '💾 RAM',
  ping_commit: '📦 コミット',

  // General errors
  error_generic: '❌ エラーが発生しました。後でもう一度お試しください。',
  error_cooldown: '⏳ あと **{sec}秒** 待ってください！',

  // Info command
  info_no_login: '⚠️ サーバーがログインしていません。`/login` で連携してください。',

  // Login
  login_already: '✅ **{user}** が {time} にログイン済みです。',
  login_no_url: '❌ ログインリンクを生成できませんでした。',
  login_prompt: '🔗 MyMiraiアカウントを連携するにはリンクにアクセスしてください:\n{url}\n\n⏳ リンクは10分間有効です。',
  login_done: '✅ ログイン成功！ようこそ **{user}** さん！',

  // Logout
  logout_only_owner: '❌ **{user}** のみログアウトできます。',
  logout_done: '👋 ログアウトしました。',

  // Prefix
  prefix_max_len: '❌ プレフィックスは最大3文字です。',
  prefix_changed: '✅ プレフィックスを `{prefix}` に変更しました。',
  prefix_only_owner: '❌ **{user}** のみプレフィックスを変更できます。',

  // Rank / Leaderboard
  rank_title: '{user} のランク',
  rank_level: '🏆 レベル',
  rank_xp: '✨ XP',
  rank_xp_next: '📈 次のレベルまでのXP',
  rank_footer: 'レベル {level} に必要なXP: {required}',
  leaderboard_empty: '📭 このサーバーにはまだレベルデータがありません。',
  leaderboard_title: '🏆 {guild} — ランキング',
  leaderboard_footer: 'トップ {count} メンバー',

  // Songinfo
  songinfo_not_found: '❌ 曲が見つかりませんでした。',
  songinfo_no_playing: '❌ 再生中の曲がありません。`/songinfo <曲名>` で検索できます。',
  songinfo_no_id: '❌ 曲の情報を取得できません。',
  songinfo_api_fail: '❌ YouTube APIから情報を読み込めません。',
  songinfo_channel: '👤 チャンネル',
  songinfo_duration: '⏱ 時間',
  songinfo_published: '📅 公開日',
  songinfo_views: '👁 再生回数',
  songinfo_likes: '👍 いいね',
  songinfo_tags: '🏷 タグ',
  songinfo_description: '📝 説明',

  // Image
  image_cat_title: '🐱 ランダム猫',
  image_dog_title: '🐶 ランダム犬',
  image_anime_title: '✨ アニメ {name}',
  image_meme_title: '😂 ランダムミーム',
  image_error: '❌ エラーが発生しました。後でもう一度お試しください。',

  // RP
  rp_need_target: '❌ このコマンドにはユーザーをメンションしてください。',
  rp_error: '❌ エラーが発生しました。後でもう一度お試しください。',

  // Utility
  utility_no_icon: '❌ このサーバーにはアイコンがありません。',
  utility_no_banner: '❌ このサーバーにはバナーがありません。',
  utility_no_roles: 'ロールがありません。',
  utility_error: '❌ エラーが発生しました。後でもう一度お試しください。',
  utility_guild_info_footer: 'サーバー情報',
  utility_user_info_footer: 'ユーザー情報',
  utility_bot_yes: 'はい',
  utility_bot_no: 'いいえ',
};
