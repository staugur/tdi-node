//生产环境pm2配置文件

const get_cfg = require("./src/cfg.js");

const NOCLEAN = get_cfg("noclean");

const ENV = {
    NODE_ENV: "production"
};

let apps = [{
    //general
    name: 'tdi-node',
    cwd: './src',
    script: 'server.js', //启动执行的初始脚本
    instances: 1, //'max'
    exec_mode: 'cluster',

    //advanced
    watch: false, //监听文件变化
    max_memory_restart: '1024M', //内存达到多少会自动restart
    env: ENV,
    error_file: "logs/error.log",
    time: true,
    merge_logs: true,

    //control
    listen_timeout: 3000,
    kill_timeout: 5000,
    restart_delay: 3000,
    max_restarts: 5
}, {
    name: 'tdi-queue',
    cwd: './src',
    script: 'worker.js',
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    env: ENV,
    error_file: "logs/error.log",
    time: false,
    merge_logs: true
}, {
    name: "tdi-clean",
    script: "cleanDownload.js",
    cwd: "./src",
    log_file: "logs/cli.log",
    time: true,
    merge: true,
    restart_delay: 60000 //这里是重点，这是自动重启的时间, 单位是毫秒
}];


if (NOCLEAN === 'true' || NOCLEAN === true) {
    apps.pop(2);
}

module.exports = {
    apps: apps
};
