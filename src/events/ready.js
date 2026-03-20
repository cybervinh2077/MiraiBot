module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║         MiraiBot is Online!          ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`🤖 Bot name    : ${client.user.tag}`);
    console.log(`🆔 Bot ID      : ${client.user.id}`);
    console.log(`🌐 Servers     : ${client.guilds.cache.size}`);
    console.log(`👥 Users       : ${client.users.cache.size}`);
    console.log(`📡 Ping        : ${client.ws.ping}ms`);
    console.log(`⏰ Started at  : ${now}`);
    console.log(`🔗 API URL     : ${process.env.API_URL}`);
    console.log(`🔑 API Key     : ${process.env.API_KEY ? '✅ Loaded' : '❌ Missing'}`);
    console.log('──────────────────────────────────────');
    console.log(`📦 Commands    : ${client.commands.size} loaded`);
    client.commands.forEach((_, name) => console.log(`   └─ /${name}`));
    console.log('──────────────────────────────────────');
    console.log('');

    // Set activity và update mỗi 5 phút
    const updateActivity = () => {
      const servers = client.guilds.cache.size;
      const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
      client.user.setPresence({
        activities: [{
          name: 'System info',
          state: `${servers} servers • ${users} users`,
          type: 4, // type 4 = Custom Status
        }],
        status: 'online',
      });
    };

    updateActivity();
    setInterval(updateActivity, 5 * 60 * 1000);
  },
};
