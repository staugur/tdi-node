const PKG = require(`${__dirname}/../package.json`);
const {
    createHash
} = require('crypto');
const {
    execSync
} = require("child_process");
const {
    existsSync
} = require("fs");

const CFG = `${__dirname}/../config.json`;
const ENV = (existsSync(CFG) && require(CFG) || {});

function get_cfg(key, dv) {
    //dv即默认值
    let v = PKG[key] || process.env[`crawlhuabantdi_${key}`] || ENV[key] || dv || '';
    console.log(`get_cfg for ${key}, ${v}`);
    return v;
}

function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}

function isArray(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
}

function checkSignature(signature, timestamp, nonce) {
    let TOKEN = get_cfg('token');
    let args = [TOKEN, timestamp, nonce];
    args.sort();
    let mysig = createHash("sha1").update(args.join("")).digest("hex");
    return mysig === signature;
}

function signature_required(req, res, next) {
    let signature = req.query.signature || '';
    let timestamp = req.query.timestamp || '';
    let nonce = req.query.nonce || '';
    if (checkSignature(signature, timestamp, nonce) === true) {
        next();
    } else {
        res.json({
            code: 1,
            msg: "Invalid signature"
        });
    }
}

function make_zipfile(zip_filename, zip_path, exclude = []) {
    if (!isArray(exclude)) {
        return false;
    }
    let x = exclude.map((suffix) => {
        if (suffix.startsWith(".") === false) {
            suffix = "." + suffix;
        }
        return " -x *" + suffix;
    }).join("");
    execSync(`zip -r ${zip_filename} ${zip_path} ${x}`, {
        cwd: "PATH_TO_FOLDER_YOU_WANT_ZIPPED_HERE"
    });
}

module.exports = {
    get_cfg,
    isArray,
    isObject,
    signature_required
};