const request = require('request')
const path = require('path')
const fs = require('fs')
const { existsSync } = require('fs')
const { diskRate, log } = require('./util.js')

class PromisseHandle {
    constructor({ uri, dest, filename, headers, diskLimit }) {
        this.promise = {
            resolve: null,
            reject: null
        }
        this.diskLimit = diskLimit
        this.downloadParams = {
            uri,
            dest,
            filename,
            headers
        }

        this.fileInfo = {
            path: null,
            savedAt: null,
            size: null
        }

        this.RejectOrResolve = this._RejectOrResolve.bind(this)
        this.requestCallback = this._requestCallback.bind(this)
        this.writeFileCallback = this._writeFileCallback.bind(this)
    }

    _writeFileCallback(err) {
        const { reject, resolve } = this.promise
        if (err) {
            reject(err)
            return
        }
        this.fileInfo.savedAt = Date.now()
        resolve(this.fileInfo)
    }

    _requestCallback(error, response, body) {
        const { reject } = this.promise
        const { dest, filename } = this.downloadParams

        if (error) {
            fs.writeFile(
                path.join(dest, 'README.txt'),
                error,
                {
                    flag: 'a+'
                },
                this.writeFileCallback
            )
            //reject(error, response, body)
            return
        }

        if (body) {
            this.fileInfo.path = path.join(dest, filename)
            this.fileInfo.size = `${body.length / 1000}kb`

            if (!existsSync(this.fileInfo.path)) {
                if (diskRate(dest) <= this.diskLimit) {
                    log.debug(this.fileInfo.path)
                    fs.writeFile(
                        this.fileInfo.path,
                        body,
                        'binary',
                        this.writeFileCallback
                    )
                } else {
                    fs.writeFile(
                        path.join(dest, 'README.txt'),
                        `\r\nDisk usage is too high, so unsaved ${this.fileInfo.path}`,
                        {
                            flag: 'a+'
                        },
                        this.writeFileCallback
                    )
                }
            }
        }
    }

    _RejectOrResolve(resolve, reject) {
        const { uri, headers } = this.downloadParams
        this.promise.resolve = resolve
        this.promise.reject = reject

        request(
            uri,
            {
                encoding: 'binary',
                headers: headers || {}
            },
            this.requestCallback
        )
    }
}

function ImageDownloader({ imgs, dest, diskLimit = 80 }) {
    if (imgs && dest) {
        if (typeof imgs === 'object' && imgs.length) {
            let Allpromises = []

            for (var i = 0; i < imgs.length; i++) {
                const { uri, filename, headers } = imgs[i]
                if (!existsSync(path.join(dest, filename))) {
                    const handdle = new PromisseHandle({
                        uri,
                        filename,
                        dest,
                        headers,
                        diskLimit
                    })
                    Allpromises.push(new Promise(handdle.RejectOrResolve))
                }
            }

            return Promise.all(Allpromises)
        }
    } else {
        throw new TypeError('imgs and dest params is required')
    }
}

module.exports = ImageDownloader
