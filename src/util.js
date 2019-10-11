const PKG = require(`${__dirname}/../package.json`);
const {
    createHash
} = require('crypto');
const {
    execSync
} = require("child_process");
const {
    existsSync,
    readdirSync,
    statSync,
    mkdirSync,
    unlinkSync,
    rmdirSync
} = require("fs");
const {
    extname,
    join
} = require("path");

const CFG = `${__dirname}/../config.json`;
const CONFIG = (existsSync(CFG) && require(CFG) || {});

function get_cfg(key, dv) {
    //dv即默认值
    let v = PKG[key] || CONFIG[key] || process.env[`crawlhuabantdi_${key}`] || dv || '';
    return v;
}

function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}

function isArray(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
}

function diskRate(path, ret = "percent") {
    let cmd = `df --output=size,used,avail,pcent ${path}`;
    if (typeof path === "string" && existsSync(path)) {
        let result = execSync(cmd).toString().trim().split("\n");
        if (result.length === 2) {
            let data = result[1].trim().split(/\s+/);
            if (data.length === 4) {
                let percent = Number(data[3].replace(/%$/gi, ""));
                return ret === "percent" ? percent : {
                    total: Number(data[0]),
                    used: Number(data[1]),
                    available: Number(data[2]),
                    percent: percent
                }
            }
        }
    }
}

function makedir(path) {
    if (typeof path === "string" && !existsSync(path)) {
        mkdirSync(path);
    }
}

function rmtree(path) {
    let files = [];
    if (existsSync(path)) {
        files = readdirSync(path);
        files.forEach(function (file, index) {
            let curPath = join(path, file);
            if (statSync(curPath).isDirectory()) { // recurse
                rmtree(curPath);
            } else { // delete file
                unlinkSync(curPath);
            }
        });
        rmdirSync(path);
    }
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

function make_zipfile(zip_filename, zip_path, exclude = [], cwd = __dirname) {
    if (!isArray(exclude)) {
        return false;
    }
    let xs = exclude.map((suffix) => {
        if (suffix.startsWith(".") === false) {
            suffix = "." + suffix;
        }
        return " -x *" + suffix;
    }).join("");
    return execSync(`zip -r ${zip_filename} ${zip_path} ${xs}`, {
        cwd: cwd
    });
}

function getDirSize(dir_path, exclude = []) {
    if (!isArray(exclude)) {
        return false;
    }
    let size = 0;
    for (let fd of readdirSync(dir_path)) {
        let fi = statSync(join(dir_path, fd));
        if (fi.isFile() && !exclude.includes(extname(fd))) {
            size += fi.size;
        }
    }
    return size;
}

function formatSize(fileSizeInBytes) {
    var i = -1;
    var byteUnits = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(2) + byteUnits[i];
}

var log = require("loglevel");
log.setDefaultLevel("info");
log.setLevel(get_cfg("loglevel"));

module.exports = {
    get_cfg,
    isArray,
    isObject,
    signature_required,
    make_zipfile,
    getDirSize,
    formatSize,
    diskRate,
    makedir,
    rmtree,
    log
};
