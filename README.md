# tdi-node
花瓣网、堆糖网下载油猴脚本的远程下载服务(Tdi for node.js).

此程序相当于`CrawlHuaban`(中心端)的成员，用户选择远端下载后会由中心端选择一个成员提供给用户，减少中心端压力。

另外Python版本的仓库地址是：https://github.com/staugur/tdi

另外PHP版本的仓库地址是：https://github.com/staugur/tdi-php

## 使用说明

#### 安装依赖

    `yarn` or `npm install`

#### 开发环境运行

1. 启动Web服务

    `yarn start` or `npm start`

2. 启动队列处理进程

    `yarn start:worker` or `npm start:worker`

#### 正式环境运行

使用pm2管理Web进程和队列进程。

- 查看进程状态

    `yarn run prod` or `npm run prod`

- 启动

    `yarn run prod:start` or `npm run prod:start`

- 停止

    `yarn run prod:stop` or `npm run prod:stop`

- 重载

    `yarn run prod:reload` or `npm run prod:reload`

- 重启

    `yarn run prod:restart` or `npm run prod:restart`

- 删除

    `yarn run prod:delete` or `npm run prod:delete`

## Nginx配置示例

```
server {
    listen 80;
    server_name 域名;
    charset utf-8;
    #防止在IE9、Chrome和Safari中的MIME类型混淆攻击
    add_header X-Content-Type-Options nosniff;
    client_max_body_size 10M;
    client_body_buffer_size 128k;
    #不允许搜索引擎抓取信息
    if ($http_user_agent ~* "qihoobot|Baiduspider|Googlebot|Googlebot-Mobile|Googlebot-Image|Mediapartners-Google|Adsbot-Google|Feedfetcher-Google|Yahoo! Slurp|Yahoo! Slurp China|YoudaoBot|Sosospider|Sogou spider|Sogou web spider|Sogou+web+spider|bingbot|MSNBot|ia_archiver|Tomato Bot") {
        return 403;
    }
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
