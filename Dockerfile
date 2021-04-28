FROM node:12

LABEL maintainer=me@tcw.im

ENV REGISTRY https://registry.npm.taobao.org

COPY . /Tdi-node

RUN cd /Tdi-node && yarn --production --registry=$REGISTRY \
    && apt-get update \
    && apt-get install zip \
    && ln -sf /Tdi-node/node_modules/.bin/pm2-runtime /usr/bin/pm2-runtime

WORKDIR /Tdi-node

CMD [ "pm2-runtime", "ecosystem.config.js" ]
