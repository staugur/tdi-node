/*!
 * A small application that provides images for asynchronous downloads.
 * Copyright 2019, MIT LICENSE.
 */

//依赖模块
const {
    loadavg
} = require('os');
const {
    existsSync,
    mkdirSync
} = require('fs');
const {
    get_cfg,
    isObject,
    signature_required,
    memRate,
    diskRate
} = require("./util.js");
const Redis = require("redis");
const Queue = require("bee-queue");
const express = require("express");

//配置信息
const VERSION = get_cfg('version');
const STATUS = get_cfg('status', 'ready');
const ALARMEMAIL = get_cfg('alarmemail');
const HOST = get_cfg('host', '127.0.0.1');
const PORT = Number(get_cfg('port', 3000));
const REDIS_URL = get_cfg('redis');
const TOKEN = get_cfg('token');
const QUEUE_NAME = "tdi";

if (!REDIS_URL) throw new Error("Invalid configuration: redis");
if (!TOKEN) throw new Error("Invalid configuration: token");
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

app.use(express.json({
    limit: '10mb'
})); // for parsing application/json

app.get('/ping', signature_required, (req, res) => {
    let resp = {
        code: 0,
        version: VERSION,
        status: STATUS,
        memRate: memRate(),
        loadFive: parseFloat(loadavg()[1].toFixed(2)),
        diskRate: diskRate(DOWNLOAD_DIR),
        timestamp: Math.round(Date.now() / 1000),
        rqcount: 0,
        rqfailed: 0,
        email: ALARMEMAIL,
        lang: 'Node' + process.versions.node
    }
    rc.multi().llen(`bq:${QUEUE_NAME}:waiting`).scard(`bq:${QUEUE_NAME}:failed`).exec((err, results) => {
        let [rqcount, rqfailed] = results;
        resp["rqcount"] = rqcount;
        resp["rqfailed"] = rqfailed;
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
            if (!err) {
                resp["code"] = 0;
                let job = queue.createJob({
                    download_dir: DOWNLOAD_DIR,
                    uifn: uifn,
                    disk_limit: Number(data.DISKLIMIT || 80)
                });
                job.timeout(Number(data.TIMEOUT || 7200) * 1000).retries(0).save().then((job) => {
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