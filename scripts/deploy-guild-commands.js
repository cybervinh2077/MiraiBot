require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Thay GUILD_ID bằng ID server Discord của bạn
const GUILD_ID = process.env.GUILD_ID || '829168241372168243'; // ID server test của bạn

const commands = [];
const commandsPath = path.join(__dirname, '../src/commands');

function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if (command.data && command.execute) {
          commands.push(command.data.toJSON());
        }
      } catch (err) {
        console.error(`❌ Failed to load ${entry.name}:`, err.message);
      }
    }
  }
}

loadCommands(commandsPath);

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`🔄 Deploying ${commands.length} commands to guild ${GUILD_ID}...`);
    
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ Successfully deployed ${commands.length} guild commands!`);
    console.log(`💡 Commands sẽ xuất hiện NGAY LẬP TỨC trong server này.`);
    console.log(`\nDanh sách: ${commands.map(c => '/' + c.name).join(', ')}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
