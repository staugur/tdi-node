#!/usr/bin/env node

//const winr = require('why-is-node-running')
const {
    readdirSync,
    statSync,
    unlinkSync
} = require("fs");
const {
    basename,
    extname,
    join
} = require("path");
const request = require("request");
const Redis = require("redis");
const get_cfg = require("./cfg.js");

const REDIS_URL = get_cfg('redis_url');

function get_10ts() {
    return Math.round(new Date() / 1000);
}

function execute_cleanDownload(hours = 12) {
    hours = parseInt(hours);
    if (typeof hours !== "number" || isNaN(hours)) {
        hours = 12;
    }
    const DOWNLOADDIR = join(__dirname, "downloads");
    console.log(hours, DOWNLOADDIR);
    const ds = readdirSync(DOWNLOADDIR);
    console.log(ds);
    for (let uifn of ds) {
        let file_path = join(DOWNLOADDIR, uifn);
        let file_stat = statSync(file_path);
        console.log(file_path);
        if (file_stat.isFile() && extname(uifn) === ".zip") {
            console.log(`${uifn} 匹配了文件与后缀规则`);
            let [aid, mst] = uifn.split("_");
            if (aid === "hb") {
                console.log("匹配hb");
                //中心端接收到请求时的时间戳
                let ctime = parseInt(parseInt(mst) / 1000);
                console.log(ctime);
                //实际生成压缩文件时的时间戳
                let file_ctime = parseInt(file_stat.ctime.getTime() / 1000);
                console.log(file_ctime);
                console.log(get_10ts());
                if ((ctime + 3600 * hours) <= get_10ts() && (file_ctime + 3600 * hours) <= get_10ts()) {
                    console.log("即将删除文件");
                    //已过期，清理文件
                    unlinkSync(file_path);
                    console.log(`Remove zip file: ${file_path}`);
                    let rc = Redis.createClient(REDIS_URL);
                    rc.hgetall(uifn, (err, obj) => {
                        rc.quit();
                        console.log(`redis hgetall, err: ${err}`)
                        if (obj.CALLBACK_URL) {
                            //回调
                            request({
                                uri: obj.CALLBACK_URL + '?Action=SECOND_STATUS',
                                method: "POST",
                                headers: {
                                    "User-Agent": "Tdi-Node/v1",
                                    "Connection": "close"
                                },
                                form: {
                                    uifn: uifn
                                },
                                timeout: 3000
                            }, (error, response, body) => {
                                console.log('request callbacked', error);
                                //console.log(error.code === 'ETIMEDOUT');
                                console.log(`Update expired status for ${uifn}, resp is ${body}`);
                                if (!error && response.statusCode == 200) {
                                    //请求成功
                                    let resp = JSON.parse(body);
                                    if (resp.code === 0) {
                                        //rc.del(uifn, () => {
                                        //});
                                    }

                                }
                            });
                        }
                    });
                } else {
                    console.log('?')
                }
            }
        } else {
            console.log(`${uifn} 不匹配`)
        }
    }
    //console.log(process._getActiveRequests());
    //console.log(process._getActiveHandles());
    //winr();
    //rc.quit();
    //process.exit();
}

if (basename(process.argv[1]) === "cleanDownload.js") {
    // 清理过期压缩文件
    execute_cleanDownload(process.argv[2] || 12);
}