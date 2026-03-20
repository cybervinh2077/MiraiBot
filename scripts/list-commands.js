require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.TOKEN);

async function listCommands() {
  try {
    console.log('🔍 Đang lấy danh sách slash commands từ Discord...\n');
    
    const commands = await rest.get(
      Routes.applicationCommands(process.env.CLIENT_ID)
    );

    if (!commands.length) {
      console.log('❌ Không có slash command nào được đăng ký.');
      return;
    }

    console.log(`✅ Tìm thấy ${commands.length} slash commands:\n`);
    
    // Group by category
    const categories = {
      'D&D': [],
      'Music': [],
      'General': [],
      'Other': [],
    };

    commands.forEach(cmd => {
      const name = cmd.name;
      if (name.includes('solo') || name.includes('quest') || name.includes('roll') || 
          name.includes('party') || name.includes('campaign') || name.includes('char') ||
          name.includes('action') || name.includes('stat') || name.includes('channel-surf') ||
          name.includes('save-state') || name.includes('load-state')) {
        categories['D&D'].push(cmd);
      } else if (['play', 'skip', 'stop', 'pause', 'resume', 'queue', 'nowplaying', 
                  'volume', 'loop', 'shuffle', 'lyrics', 'leave'].includes(name)) {
        categories['Music'].push(cmd);
      } else if (['login', 'logout', 'info', 'prefix', 'help'].includes(name)) {
        categories['General'].push(cmd);
      } else {
        categories['Other'].push(cmd);
      }
    });

    for (const [category, cmds] of Object.entries(categories)) {
      if (cmds.length > 0) {
        console.log(`📁 ${category} (${cmds.length}):`);
        cmds.forEach(cmd => {
          console.log(`   /${cmd.name} — ${cmd.description}`);
        });
        console.log('');
      }
    }

    console.log(`\n⏰ Lưu ý: Global commands có thể mất tới 1 giờ để Discord propagate đến tất cả servers.`);
    console.log(`💡 Nếu thiếu commands, hãy chờ hoặc dùng guild commands (deploy vào 1 server cụ thể).`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

listCommands();
