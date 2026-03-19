require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

const loadCommands = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) loadCommands(fullPath);
    else if (entry.name.endsWith('.js')) {
      const cmd = require(fullPath);
      if (cmd.data) commands.push(cmd.data.toJSON());
    }
  }
};

loadCommands(path.join(__dirname, '../src/commands'));

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  console.log(`🔄 Deploying ${commands.length} slash commands...`);
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands },
  );
  console.log(`✅ Done! Commands: ${commands.map(c => '/' + c.name).join(', ')}`);
})().catch(console.error);
