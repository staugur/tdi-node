//生产环境pm2配置文件
module.exports = {
    apps: [{
        //general
        name: 'tdi-node',
        script: 'server.js', //启动执行的初始脚本
        instances: 'max',
        exec_mode: 'cluster',

        //advanced
        watch: ['server.js'], //监听文件变化
        ignore_watch: ['node_modules', 'logs'], //忽略监听的文件夹
        max_memory_restart: '1024M', //内存达到多少会自动restart
        env: {
            'NODE_ENV': 'production'
        },
        log_file: './logs/sys.log',
        log_date_format: 'YYYY-MM-DD HH:mm',
        merge_logs: true,

        //control
        listen_timeout: 3000,
        kill_timeout: 5000
    }]
};