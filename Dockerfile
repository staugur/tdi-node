FROM node:10

MAINTAINER staugur <staugur@saintic.com>

COPY . /tdi-node

RUN yarn --production --registry=https://registry.npm.taobao.org

WORKDIR /tdi-node

CMD [ "yarn", "prod:run" ]