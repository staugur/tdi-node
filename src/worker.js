const {
    get_cfg,
    make_zipfile,
    makedir,
    rmtree,
    diskRate,
    getDirSize,
    formatSize,
    isArray,
    log
} = require("./util.js");
const imageDownloader = require("./imagedownloader.js");
const {
    join
} = require("path");
const {
    writeFileSync,
    statSync
} = require("fs");
const Redis = require("redis");
const Queue = require("bee-queue");
const request = require("request");

const REDIS_URL = get_cfg("redis_url");
const QUEUE_NAME = "tdi";

var rc = Redis.createClient(REDIS_URL);
var queue = new Queue(QUEUE_NAME, {
    redis: rc,
    isWorker: true,
    removeOnSuccess: true
});

queue.on('ready', () => {
    log.info('Start processing jobs...');

    queue.process((job, done) => {
        /*
        @param download_dir str: 图片直接保存到此目录的`board_id`下
        @param uifn: str: 唯一标识文件名
        @param uifnKey: str: 标识索引
        @param site: int: 站点id 1是花瓣网 2是堆糖网
        @param board_id str int: 画板id
        @param board_pins: list: 画板图片
        @param MAX_BOARD_NUMBER: int: 允许下载的画板数量
        */
        //任务处理函数
        log.info(`processing job: ${job.id}, ${JSON.stringify(job.data)}`);
        let uifn = job.data.uifn;
        let download_dir = job.data.download_dir;
        //从redis读取数据
        rc.hgetall(uifn, (err, data) => {
            let {
                board_pins,
                CALLBACK_URL,
                MAX_BOARD_NUMBER,
                board_id,
                site,
                uifnKey
            } = data;
            board_pins = JSON.parse(board_pins);
            MAX_BOARD_NUMBER = parseInt(MAX_BOARD_NUMBER);
            site = parseInt(site);
            if (board_pins.length > MAX_BOARD_NUMBER) {
                board_pins.splice(MAX_BOARD_NUMBER);
            }
            //定义说明文件
            let README = new Set();
            let ALLOWDOWN = true;
            //创建下载目录并切换，创建临时画板目录
            makedir(download_dir);
            process.chdir(download_dir);
            makedir(board_id);
            if (diskRate(download_dir) > job.data.disk_limit) {
                ALLOWDOWN = false;
                README.add("Disk usage is to high");
            }
            //允许下载的后续处理函数
            function _handler(info) {
                if (isArray(info) === true) {
                    info = `successful ${info.length}`;
                }
                log.info('DownloadBoard to handler...', info);
                //计算总共下载用时，不包含压缩文件的过程
                let dtime = (Date.now() - stime) / 1000;
                dtime.toFixed(2);
                //将提示信息写入提示文件中
                let README_L = [...README];
                if (README_L.length > 0) {
                    writeFileSync(join(download_dir, board_id, "README.txt"), README_L.join("\r\n"), {
                        flag: "a+"
                    });
                }
                //定义压缩排除
                let exclude = [".zip", ".lock"];
                //判断是否有足够的空间可以执行压缩命令
                if (diskRate(download_dir, null).available > getDirSize(board_id, exclude)) {
                    log.info("DownloadBoard, start to make zip");
                    //基本判断有足够空间执行压缩
                    let mzrets = make_zipfile(uifn, board_id, exclude, download_dir);
                    log.debug(mzrets);
                    let zipfilepath = join(download_dir, uifn);
                    log.info(`DownloadBoard make_archive over, path is ${zipfilepath}`);
                    //检测压缩文件大小
                    let size = formatSize(statSync(zipfilepath).size);
                    //删除临时画板目录
                    rmtree(board_id);
                    //回调
                    request({
                        uri: CALLBACK_URL + '?Action=FIRST_STATUS',
                        method: "POST",
                        headers: {
                            "User-Agent": "Tdi-Node/v1"
                        },
                        form: {
                            uifn: uifn,
                            uifnKey: uifnKey,
                            size: size,
                            dtime: dtime
                        }
                    }, (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            //调用done设置成功回调
                            return done(null, body);
                        }
                    });
                } else {
                    log.info("DownloadBoard, without make zip, disk usage is to high");
                }
            }
            //开始批量下载
            let stime = Date.now();
            if (ALLOWDOWN === true) {
                log.info('DownloadBoard starting...');
                imageDownloader({
                    imgs: board_pins.map((img) => {
                        return {
                            uri: img.imgUrl,
                            filename: img.imgName,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
                                "Referer": site === 1 ? `https://huaban.com/boards/${board_id}` : `https://www.duitang.com/album/?id=${board_id}`
                            }
                        };
                    }),
                    dest: join(download_dir, board_id),
                    diskLimit: job.data.disk_limit
                }).then(_handler).catch((error, response, body) => {
                    README.add(error);
                    _handler("DownloadBoard failed!");
                });
            } else {
                //即便不允许下载，后续压缩、回调等操作仍需要进行
                _handler("deny download...");
            }
        });
    });
});

queue.on('succeeded', (job, result) => {
    log.info(`Job ${job.id} succeeded with result: ${result}`);
});

queue.on('failed', (job, err) => {
    log.warn(`Job ${job.id} failed with error ${err.message}`);
});
