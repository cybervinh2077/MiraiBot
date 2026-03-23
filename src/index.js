require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

// Load commands (root + subfolders)
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const loadCommands = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        loadCommands(fullPath);
      } else if (entry.name.endsWith('.js')) {
        const command = require(fullPath);
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
          console.log(`📌 Command loaded: /${command.data.name}`);
        }
      }
    }
  };
  loadCommands(commandsPath);
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`📎 Event loaded : ${event.name}`);
  }
}

console.log('🔄 Connecting to Discord...');

// Auto-deploy slash commands on start
async function deployCommands() {
  const body = [...client.commands.values()].map(c => c.data.toJSON());
  const rest = new REST().setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body });
    console.log(`✅ Slash commands deployed: ${body.map(c => '/' + c.name).join(', ')}`);
  } catch (err) {
    console.error('❌ Failed to deploy commands:', err.message);
  }
}

deployCommands().then(() => client.login(process.env.TOKEN));

// Khởi động Telegram bot control
const telegramBot = require('./utils/telegramBot');
telegramBot.start();
client.once('ready', () => {
  telegramBot.setDiscordClient(client);

  // Đồng bộ data lên web (Supabase)
  const { startWebSync } = require('./utils/webSync');
  startWebSync(client);
});

// Pokédex auto-refresh (weekly, only fetches new entries)
const { startScheduler } = require('./pokemon/pokedexRefresher');
startScheduler();
