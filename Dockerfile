# build image
FROM node:12-alpine as build

LABEL maintainer=me@tcw.im

WORKDIR /app

COPY . ./

ARG REGISTRY

RUN yarn --production --registry=$REGISTRY

# run image
FROM node:12-alpine as runtime

WORKDIR /Tdi-node

COPY --from=build /app/ ./

ENV crawlhuabantdi_host=0.0.0.0

RUN ln -sf /Tdi-node/node_modules/.bin/pm2-runtime /usr/bin/pm2-runtime

EXPOSE 3000

ENTRYPOINT [ "pm2-runtime", "ecosystem.config.js" ]