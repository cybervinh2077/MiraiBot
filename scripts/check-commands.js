require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  const commands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
  if (!commands.length) {
    console.log('❌ Chưa có command nào được Discord approve.');
    return;
  }
  console.log(`✅ ${commands.length} commands đã được Discord register:\n`);
  commands.forEach(c => console.log(`  /${c.name} — ${c.description}`));
})().catch(console.error);
