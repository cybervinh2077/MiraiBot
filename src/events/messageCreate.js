const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

module.exports = {
  name: 'messageCreate',
  async execute(msg) {
    if (msg.author.bot) return;

    if (msg.content === '?login') {
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: API_KEY,
          },
          body: JSON.stringify({
            action: 'generate-login-link',
            discordUserId: msg.author.id,
            discordUsername: msg.author.username,
          }),
        });

        const data = await res.json();

        if (!data.loginUrl) {
          return msg.reply('❌ Không thể tạo link đăng nhập. Vui lòng thử lại sau.');
        }

        await msg.reply(
          `🔗 Để liên kết tài khoản MyMirai, truy cập:\n${data.loginUrl}\n\n⏳ Link có hiệu lực trong 10 phút.`
        );

        // Poll for login completion every 5 seconds
        const interval = setInterval(async () => {
          try {
            const check = await fetch(API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
              },
              body: JSON.stringify({
                action: 'check-login-status',
                state: data.state,
              }),
            });

            const result = await check.json();

            if (result.status === 'completed') {
              clearInterval(interval);
              await msg.reply('✅ Đăng nhập thành công! Tài khoản đã được liên kết.');
            }
          } catch (err) {
            console.error('Poll error:', err);
          }
        }, 5000);

        // Stop polling after 10 minutes
        setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
      } catch (err) {
        console.error('Login error:', err);
        await msg.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
      }
    }
  },
};
