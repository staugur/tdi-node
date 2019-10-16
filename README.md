# Tdi-node
花瓣网、堆糖网下载油猴脚本的远程下载服务(Tdi for Node.js).

此程序相当于`CrawlHuaban`(中心端)的成员，用户选择远端下载后会由中心端选择一个成员提供给用户，减少中心端压力。

Python版本的仓库地址是：https://github.com/staugur/tdi

PHP版本的仓库地址是：https://github.com/staugur/tdi-php


## 部署

要求：Node8+，Redis2+

#### 安装依赖

- 安装程序依赖的npm包：

    - 开发环境： `yarn` or `npm install`

    - 正式环境： `yarn --production` or `npm install --production`

- 安装程序所需系统命令的包： `zip`

    - CentOS/Fedora/RHEL: `yum install zip`

    - Ubuntu: `apt-get update && apt-get install zip`

#### 开发环境运行

1. 启动Web服务

    `yarn start` or `npm start`

2. 启动队列处理进程

    `yarn start:worker` or `npm start:worker`

#### 正式环境运行

使用pm2管理Web进程和队列进程，另外还包含一个定时任务，会每60s清理过期下载文件。

- 查看进程状态

    `yarn prod` or `npm run prod`

- 启动

    `yarn prod:start` or `npm run prod:start`

- 停止

    `yarn prod:stop` or `npm run prod:stop`

- 重载

    `yarn prod:reload` or `npm run prod:reload`

- 重启

    `yarn prod:restart` or `npm run prod:restart`

- 删除

    `yarn prod:delete` or `npm run prod:delete`


## 更多文档：

[点击查看文档](https://docs.saintic.com/tdi-node/ "点击查看部署及使用文档")，关于普通部署、使用手册、注意事项等问题。

若上述地址异常，备用地址是：[https://saintic-docs.readthedocs.io/tdi-node/](https://saintic-docs.readthedocs.io/tdi-node/)


## Nginx配置示例

```
server {
    listen 80;
    server_name 域名;
    charset utf-8;
    client_max_body_size 10M;
    client_body_buffer_size 128k;
    #此路径是为了下载实际图片压缩包，直接走nginx
    location /downloads {
        #程序下载目录(源码下的src/downloads或者容器的主机挂载点)
        alias /path/to/tdi-node/src/downloads/;
        default_type application/octet-stream;
        if ($request_filename ~* ^.*?\.(zip|tgz)$){
            add_header Content-Disposition 'attachment;';
        }
    }
    location / {
        #3000是默认端口
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
