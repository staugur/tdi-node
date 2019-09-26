/*!
 * A small application that provides images for asynchronous downloads.
 * Copyright 2019, MIT LICENSE.
 */

//配置信息
const HOST = "127.0.0.1"
const PORT = 3000
const VERSION = require('./package.json').version
const STATUS = 'enabled'
const ALARMEMAIL = ''

//接口实现
var express = require('express');
var app = express();
var {
    totalmem,
    freemem,
    loadavg,
} = require('os');
var {
    existsSync,
    mkdirSync
} = require('fs');
var diskusage = require('diskusage-ng');

const DOWNLOAD_DIR = __dirname + '/downloads';
if (!existsSync(DOWNLOAD_DIR)) {
    mkdirSync(DOWNLOAD_DIR);
}
app.get('/ping', function (req, res) {
    let resp = {
        code: 0,
        version: VERSION,
        status: STATUS,
        'memRate': parseFloat((100 * (totalmem() - freemem()) / totalmem()).toFixed(2)),
        'loadFive': parseFloat(loadavg()[1].toFixed(2)),
        'diskRate': 0,
        'timestamp': Math.round(Date.now() / 1000),
        'rqcount': 0,
        'rqfailed': 0,
        'email': ALARMEMAIL,
        'lang': 'Node.js ' + process.versions.node
    }
    diskusage(DOWNLOAD_DIR, (err, usage) => {
        resp["diskRate"] = parseFloat((usage.used / (usage.used + usage.available) * 100).toFixed(2));
        res.json(resp);
    });
});

app.use(function (req, res, next) {
    res.status(404).send('Not found page');
});

app.listen(PORT, HOST, function () {
    console.log(`Server running at http://${HOST}:${PORT}`);
});