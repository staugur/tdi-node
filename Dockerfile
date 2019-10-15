FROM node:10

MAINTAINER staugur <staugur@saintic.com>

COPY . /Tdi-node

RUN cd /Tdi-node && yarn --production --registry=https://registry.npm.taobao.org && apt-get update && apt-get install zip

WORKDIR /Tdi-node

CMD [ "yarn", "prod:run" ]
