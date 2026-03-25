const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { execSync } = require('child_process');
const os = require('os');
const { t } = require('../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ và thông tin hệ thống'),

  async execute(interaction) {
    await interaction.deferReply();
    const g = interaction.guild.id;
    const latency = Date.now() - interaction.createdTimestamp;

    let commitHash = 'N/A', commitMsg = 'N/A';
    try {
      commitHash = execSync('git rev-parse --short HEAD', { cwd: process.cwd() }).toString().trim();
      commitMsg  = execSync('git log -1 --pretty=%s',    { cwd: process.cwd() }).toString().trim();
    } catch {}

    const uptimeSec = Math.floor(process.uptime());
    const uh = Math.floor(uptimeSec / 3600);
    const um = Math.floor((uptimeSec % 3600) / 60);
    const us = uptimeSec % 60;
    const uptime = `${uh}h ${um}m ${us}s`;

    const cpus     = os.cpus();
    const cpuModel = cpus[0]?.model?.trim() || 'N/A';
    const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
    const freeMem  = (os.freemem()  / 1024 / 1024).toFixed(0);
    const usedMem  = (totalMem - freeMem).toFixed(0);

    let cpuTemp = 'N/A';
    try {
      const raw = execSync('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null').toString().trim();
      cpuTemp = (parseInt(raw) / 1000).toFixed(1) + '°C';
    } catch {}

    const [load1, load5] = os.loadavg();

    const embed = new EmbedBuilder()
      .setTitle(t(g, 'ping_title'))
      .setColor(0x5865f2)
      .addFields(
        { name: t(g, 'ping_api_latency'), value: `${latency}ms`,                              inline: true },
        { name: t(g, 'ping_websocket'),   value: `${interaction.client.ws.ping}ms`,           inline: true },
        { name: t(g, 'ping_uptime'),      value: uptime,                                      inline: true },
        { name: t(g, 'ping_cpu'),         value: cpuModel,                                    inline: false },
        { name: t(g, 'ping_temp'),        value: cpuTemp,                                     inline: true },
        { name: t(g, 'ping_load'),        value: `${load1.toFixed(2)} / ${load5.toFixed(2)}`, inline: true },
        { name: t(g, 'ping_ram'),         value: `${usedMem}MB / ${totalMem}MB`,              inline: true },
        { name: t(g, 'ping_commit'),      value: `\`${commitHash}\` ${commitMsg.slice(0, 50)}`, inline: false },
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
