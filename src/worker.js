const Redis = require("redis");
const Queue = require("bee-queue");
const {
    get_cfg
} = require("./util.js");

const REDIS_URL = get_cfg('redis_url');
const QUEUE_NAME = "tdi";

var rc = Redis.createClient(REDIS_URL);
var queue = new Queue(QUEUE_NAME, {
    redis: rc
});

queue.on('ready', () => {
    console.log('Start processing jobs...');

    queue.process((job, done) => {
        //任务处理函数
        console.log(`processing job: ${job.id}, ${job.data.download}, ${job.data.uifn},${job.data.diskLimit}`);
        //调用done设置成功回调
        let result = "Successfully";
        return done(null, result);
        /*
        setTimeout(() => {
            done(null, job.data.x + job.data.y);
        }, 10);
        */
    });
});

queue.on('succeeded', (job, result) => {
    console.log(`Job ${job.id} succeeded with result: ${result}`);
});

queue.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error ${err.message}`);
});