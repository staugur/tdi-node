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
    rmdirSync,
    appendFile,
    readFileSync
} = require("fs");
const {
    extname,
    join,
    resolve
} = require("path");
const tar = require('tar');
const get_cfg = require("./cfg.js");

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
                    total: Number(data[0]) * 1024,
                    used: Number(data[1]) * 1024,
                    available: Number(data[2]) * 1024,
                    percent: percent
                }
            }
        }
    }
}

function memRate() {
    var mem = {};
    var data = readFileSync('/proc/meminfo').toString();
    data.split(/\n/g).forEach(function (line) {
        line = line.split(':');

        // Ignore invalid lines, if any
        if (line.length < 2) {
            return;
        }

        // Remove parseInt call to make all values strings
        mem[line[0]] = parseInt(line[1].trim(), 10);
    });

    let percent = (mem['MemTotal'] - mem['MemFree'] - mem['Buffers'] - mem['Cached']) / mem["MemTotal"] * 100;

    return parseFloat(percent.toFixed(2));
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

function checkTimestamp(req_timestamp) {
    if (typeof req_timestamp === 'string' && req_timestamp.length === 10) {
        let rt = parseInt(req_timestamp)
        if (typeof rt !== "number" || isNaN(rt)) {
            return;
        } else {
            let nt = parseInt(Date.now() / 1000);
            if ((rt <= nt || rt - 10 <= nt) && (rt + 300 >= nt)) {
                return true;
            }
        }
    } else {
        return;
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
    if (checkTimestamp(timestamp) === true) {
        if (checkSignature(signature, timestamp, nonce) === true) {
            next();
        } else {
            res.json({
                code: 1,
                msg: "Invalid signature"
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "Invalid timestamp"
        });
    }
}

function make_tarfile_builtin(tar_filename, tar_path, exclude = [], cwd = null) {
    if (!isArray(exclude) || extname(tar_filename) !== ".tar" || !existsSync(tar_path)) {
        return false;
    }
    let xs = exclude.map((suffix) => {
        if (suffix.startsWith(".") === false) {
            suffix = "." + suffix;
        }
        return "--exclude=*" + suffix;
    }).join("");
    let options = {
        cwd: cwd || process.cwd()
    };
    execSync(`tar -cf ${tar_filename} ${xs} ${tar_path}`, options);
    readdirSync(tar_path).forEach((name) => {
        unlinkSync(join(tar_path, name));
    });
    return resolve(tar_filename);
}

function make_tarfile(tar_filename, tar_path, exclude = []) {
    if (!isArray(exclude) || extname(tar_filename) !== ".tar" || !existsSync(tar_path)) {
        return false;
    }
    let entries = readdirSync(tar_path).map((name) => {
        return join(tar_path, name);
    }).filter((name) => {
        return !exclude.includes(extname(name));
    });
    tar.c({
        file: tar_filename,
        sync: true
    }, entries)
    for (let f of entries) {
        unlinkSync(f);
    }
    return resolve(tar_filename);
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

var tracer = require("tracer");
var log = tracer.console({
    format: "[ {{title}} ] {{timestamp}} {{file}}:{{line}} {{message}}",
    preprocess: function (data) {
        data.title = data.title.toUpperCase();
    },
    transport: function (data) {
        let logdir = join(__dirname, "logs");
        makedir(logdir);
        appendFile(join(logdir, "sys.log"), data.rawoutput + '\n', (err) => {
            if (err) throw err;
        });
    }
});
tracer.setLevel(get_cfg("loglevel", "INFO"));

module.exports = {
    get_cfg,
    isArray,
    isObject,
    signature_required,
    make_tarfile,
    getDirSize,
    formatSize,
    diskRate,
    memRate,
    makedir,
    rmtree,
    log
};