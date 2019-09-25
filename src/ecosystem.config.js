//生产环境pm2配置文件
module.exports = {
    apps: [{
        //general
        name: 'tdi-node',
        script: 'server.js', //启动执行的初始脚本
        instances: "max",
        exec_mode: "cluster",

        //advanced
        watch: ['ecosystem.config.js', 'server.js'], //监听文件变化
        ignore_watch: ['node_modules', ], //忽略监听的文件夹
        max_memory_restart: '1024M', //内存达到多少会自动restart
        env: {
            "NODE_ENV": "production"
        },

        //log file
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z', //日志格式

        //control
        min_uptime: 3000,
        listen_timeout: 3000,
        kill_timeout: 5000,
        max_restarts: 5,
    }]
};
