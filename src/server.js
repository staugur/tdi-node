/*!
 * A small application that provides images for asynchronous downloads.
 * Copyright 2019, MIT LICENSE.
 */

//依赖模块
const express = require('express');
const {
    totalmem,
    freemem,
    loadavg,
} = require('os');
const {
    existsSync,
    mkdirSync
} = require('fs');
const diskusage = require('diskusage-ng');
const Redis = require("redis");
const Queue = require("bee-queue");
const {
    get_cfg,
    isObject,
    signature_required
} = require("./util.js");

//配置信息
const VERSION = get_cfg('version');
const STATUS = get_cfg('status', 'enabled');
const ALARMEMAIL = get_cfg('alertmail');
const HOST = get_cfg('host', '127.0.0.1');
const PORT = Number(get_cfg('port', 3000));
const REDIS_URL = get_cfg('redis_url');
const QUEUE_NAME = "tdi";

var rc = Redis.createClient(REDIS_URL);
var queue = new Queue(QUEUE_NAME, {
    redis: rc,
    isWorker: false
});

//压缩文件存放目录
const DOWNLOAD_DIR = __dirname + '/downloads';
if (!existsSync(DOWNLOAD_DIR)) {
    mkdirSync(DOWNLOAD_DIR);
}

var app = express();

app.use(express.json()); // for parsing application/json

app.get('/ping', signature_required, (req, res) => {
    let resp = {
        code: 0,
        version: VERSION,
        status: STATUS,
        memRate: parseFloat((100 * (totalmem() - freemem()) / totalmem()).toFixed(2)),
        loadFive: parseFloat(loadavg()[1].toFixed(2)),
        diskRate: 0,
        timestamp: Math.round(Date.now() / 1000),
        rqcount: 0,
        rqfailed: 0,
        email: ALARMEMAIL,
        lang: 'Node' + process.versions.node
    }
    rc.scard(`bq:${QUEUE_NAME}:waiting`, (err, data) => {
        resp["rqcount"] = data;
    });
    rc.scard(`bq:${QUEUE_NAME}:failed`, (err, data) => {
        resp["rqfailed"] = data;
    });
    diskusage(DOWNLOAD_DIR, (err, usage) => {
        resp["diskRate"] = parseFloat((usage.used / (usage.used + usage.available) * 100).toFixed(2));
        res.json(resp);
    });
});

app.post('/download', signature_required, (req, res) => {
    let resp = {
        code: 1,
        msg: null
    };
    let data = req.body; //It should be a valid json data
    if (isObject(data) === true && data.hasOwnProperty("uifnKey") && data.hasOwnProperty("site") && data.hasOwnProperty("board_id") && data.hasOwnProperty("uifn") && data.hasOwnProperty("board_pins") && data.hasOwnProperty("etime") && data.hasOwnProperty("MAX_BOARD_NUMBER") && data.hasOwnProperty("CALLBACK_URL")) {
        let uifn = data.uifn;
        let etime = parseInt(data.etime);
        rc.multi().hmset(uifn, {
            etime: etime,
            CALLBACK_URL: data.CALLBACK_URL,
            board_pins: data.board_pins,
            MAX_BOARD_NUMBER: data.MAX_BOARD_NUMBER,
            board_id: data.board_id,
            site: data.site,
            uifnKey: data.uifnKey
        }).expireat(uifn, etime + (7 * 24 * 3600)).exec((err, results) => {
            console.log('post download, result: ',results);
            if (!err) {
                resp["code"] = 0;
                let job = queue.createJob({
                    download: DOWNLOAD_DIR,
                    uifn: uifn,
                    diskLimit: Number(data.DISKLIMIT || 0)
                });
                job.timeout(Number(data.TIMEOUT || 0)).save().then((job) => {
                    // job enqueued, job.id populated
                    resp["jobId"] = job.id;
                    res.json(resp);
                });
            }
        });
    } else {
        resp["msg"] = "Invalid body";
        res.json(resp);
    }
});

app.use((req, res, next) => {
    res.status(404).send('Not found page');
});

app.listen(PORT, HOST, () => {
    let time = new Date().toTimeString().split(" ")[0];
    console.log(`Server running on http://${HOST}:${PORT} at ${time}`);
});