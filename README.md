# tdi-node
花瓣网、堆糖网下载油猴脚本的远程下载服务(Tdi for node.js).

此程序相当于`CrawlHuaban`(中心端)的成员，用户选择远端下载后会由中心端选择一个成员提供给用户，减少中心端压力。

另外Python版本的仓库地址是：https://github.com/staugur/tdi

另外PHP版本的仓库地址是：https://github.com/staugur/tdi-php

## 开发运行

1. 安装依赖

`yarn` or `npm install`

2. 启动Web服务

`yarn start` or `npm start`

3. 启动队列处理进程

`yarn start:worker` or `npm start:worker`
