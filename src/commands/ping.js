const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { execSync } = require('child_process');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ và thông tin hệ thống'),

  async execute(interaction) {
    await interaction.deferReply();

    const latency = Date.now() - interaction.createdTimestamp;

    // Commit
    let commitHash = 'N/A', commitMsg = 'N/A';
    try {
      commitHash = execSync('git rev-parse --short HEAD', { cwd: process.cwd() }).toString().trim();
      commitMsg  = execSync('git log -1 --pretty=%s',    { cwd: process.cwd() }).toString().trim();
    } catch {}

    // Uptime
    const uptimeSec = Math.floor(process.uptime());
    const uh = Math.floor(uptimeSec / 3600);
    const um = Math.floor((uptimeSec % 3600) / 60);
    const us = uptimeSec % 60;
    const uptime = `${uh}h ${um}m ${us}s`;

    // CPU & RAM
    const cpus     = os.cpus();
    const cpuModel = cpus[0]?.model?.trim() || 'N/A';
    const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
    const freeMem  = (os.freemem()  / 1024 / 1024).toFixed(0);
    const usedMem  = (totalMem - freeMem).toFixed(0);

    // CPU temp (Linux only)
    let cpuTemp = 'N/A';
    try {
      const raw = execSync('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null').toString().trim();
      cpuTemp = (parseInt(raw) / 1000).toFixed(1) + '°C';
    } catch {}

    // Load average
    const [load1, load5] = os.loadavg();

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(0x5865f2)
      .addFields(
        { name: '📡 API Latency',  value: `${latency}ms`,                              inline: true },
        { name: '🔌 WebSocket',    value: `${interaction.client.ws.ping}ms`,           inline: true },
        { name: '⏱️ Uptime',       value: uptime,                                      inline: true },
        { name: '🖥️ CPU',          value: cpuModel,                                    inline: false },
        { name: '🌡️ Temp',         value: cpuTemp,                                     inline: true },
        { name: '📊 Load avg',     value: `${load1.toFixed(2)} / ${load5.toFixed(2)}`, inline: true },
        { name: '💾 RAM',          value: `${usedMem}MB / ${totalMem}MB`,              inline: true },
        { name: '📦 Commit',       value: `\`${commitHash}\` ${commitMsg.slice(0, 50)}`, inline: false },
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
