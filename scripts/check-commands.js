const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, '../src/commands');

console.log('🔍 Kiểm tra cấu trúc commands...\n');

function checkCommands(dir, indent = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      console.log(`${indent}📁 ${entry.name}/`);
      checkCommands(fullPath, indent + '  ');
    } else if (entry.name.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if (command.data && command.execute) {
          console.log(`${indent}✅ ${entry.name} — /${command.data.name}`);
        } else {
          console.log(`${indent}⚠️  ${entry.name} — thiếu data hoặc execute`);
        }
      } catch (err) {
        console.log(`${indent}❌ ${entry.name} — lỗi: ${err.message}`);
      }
    }
  }
}

checkCommands(commandsPath);

console.log('\n💡 Nếu có lỗi ❌, cần fix file đó trước khi bot có thể load.');
