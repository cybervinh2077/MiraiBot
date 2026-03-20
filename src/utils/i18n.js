const { getGuildAuth, setGuildLang, getGuildLang } = require('./guildAuth');

const locales = {
  vn: require('../locales/vn'),
  en: require('../locales/en'),
  jp: require('../locales/jp'),
};

const VALID_LANGS = ['vn', 'en', 'jp'];

// t(guildId, key, vars) — lấy string theo ngôn ngữ guild
function t(guildId, key, vars = {}) {
  const lang = getGuildLang(guildId);
  const locale = locales[lang] || locales.vn;
  let str = locale[key] || locales.vn[key] || key;

  // Replace {var} placeholders
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

module.exports = { t, VALID_LANGS };
