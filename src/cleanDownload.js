#!/usr/bin/env node

const {
    readdirSync,
    statSync,
    unlinkSync,
    existsSync
} = require("fs");
const {
    extname,
    join
} = require("path");
const request = require("request");
const Redis = require("redis");
const get_cfg = require("./cfg.js");

const REDIS_URL = get_cfg('redis');

function get_10ts() {
    return Math.round(new Date() / 1000);
}

function execute_cleanDownload(hours = 12) {
    hours = parseInt(hours);
    if (typeof hours !== "number" || isNaN(hours) || hours === 0) {
        hours = 12;
    }
    const DOWNLOADDIR = join(__dirname, "downloads");
    if (!existsSync(DOWNLOADDIR)) {
        return;
    }
    const ds = readdirSync(DOWNLOADDIR);
    for (let uifn of ds) {
        let file_path = join(DOWNLOADDIR, uifn);
        let file_stat = statSync(file_path);
        if (file_stat.isFile() && [".zip", ".tar"].includes(extname(uifn))) {
            let [aid, mst] = uifn.split("_");
            if (aid === "hb") {
                //中心端接收到请求时的时间戳
                let ctime = parseInt(parseInt(mst) / 1000);
                //实际生成压缩文件时的时间戳
                let file_ctime = parseInt(file_stat.ctime.getTime() / 1000);
                if ((ctime + 3600 * hours) <= get_10ts() && (file_ctime + 3600 * hours) <= get_10ts()) {
                    //已过期，清理文件
                    unlinkSync(file_path);
                    console.log(`Remove zip file: ${file_path}`);
                    let rc = Redis.createClient(REDIS_URL);
                    rc.hgetall(uifn, (err, obj) => {
                        rc.quit();
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
                                console.log(`Update expired status for ${uifn}, resp is ${body}`);
                                rc.del(uifn, () => {
                                    rc.quit();
                                });
                            });
                        }
                    });
                }
            }
        }
    }
}

// 清理过期压缩文件
execute_cleanDownload(process.argv[2] || 12);