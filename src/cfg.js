const PKG = require(`${__dirname}/../package.json`);
const { existsSync } = require("fs");

const CFG = `${__dirname}/../config.json`;
const CONFIG = (existsSync(CFG) && require(CFG) || {});

function get_cfg(key, dv) {
    //dv即默认值
    let v = PKG[key] || CONFIG[key] || process.env[`crawlhuabantdi_${key}`] || dv || '';
    return v;
}

module.exports = get_cfg