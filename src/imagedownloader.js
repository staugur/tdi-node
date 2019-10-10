const request = require('request')
const path = require('path')
const fs = require('fs')
const mime = require('mime-types')
const {
    existsSync
} = require("fs");
const {
    diskRate,
    log
} = require('./util.js')

class PromisseHandle {
    constructor({
        uri,
        dest,
        filename,
        fileExtension,
        headers,
        diskLimit
    }) {
        this.promise = {
            resolve: null,
            reject: null,
        }
        this.diskLimit = diskLimit
        this.downloadParams = {
            uri,
            dest,
            filename,
            fileExtension,
            headers
        }

        this.fileInfo = {
            path: null,
            savedAt: null,
            size: null,
        }

        this.RejectOrResolve = this._RejectOrResolve.bind(this)
        this.requestCallback = this._requestCallback.bind(this)
        this.writeFileCallback = this._writeFileCallback.bind(this)
    }

    _writeFileCallback(err) {
        const {
            reject,
            resolve
        } = this.promise
        if (err) {
            reject(err)
            return
        }
        this.fileInfo.savedAt = Date.now()
        resolve(this.fileInfo)
    }

    _requestCallback(error, response, body) {
        const {
            reject
        } = this.promise
        const {
            dest,
            filename,
            fileExtension
        } = this.downloadParams

        if (error) {
            reject(error, response, body)
            return
        }

        if (body) {
            const {
                headers,
                statusCode,
                request
            } = response
            const {
                href
            } = request.uri

            const removeParamsReg = /\?(?=[^?]*$).+|\/|\./g
            const clearExtReg = /\.(?=[^.]*$).+|\//g
            const clearUrlToFileNameReg = /\/(?=[^/]*$).+/g
            const findFileExtReg = /\.(?=[^.\/\-]*$).+/g

            const findExt = href.match(findFileExtReg)
            const findFileNameInUrl = href.match(clearUrlToFileNameReg)
            const filenameFinal =
                typeof filename === 'string' ?
                filename :
                findFileNameInUrl && findFileNameInUrl[0] ?
                findFileNameInUrl[0].replace(clearExtReg, '') :
                Date.now()

            const finalExt =
                typeof fileExtension === 'string' ?
                fileExtension :
                findExt && findExt[0] ?
                findExt[0].replace(removeParamsReg, '') :
                mime.extension(headers['content-type'])

            const finalFilename = typeof filename === 'string' && filename.indexOf(".") > -1 ?
                filenameFinal :
                `${filenameFinal}.${finalExt}`

            const finalPath = path.join(dest, finalFilename)

            this.fileInfo.path = finalPath
            this.fileInfo.size = `${body.length / 1000}kb`

            if (!existsSync(this.fileInfo.path)) {
                if (diskRate(dest) <= this.diskLimit) {
                    log.debug(this.fileInfo.path)
                    fs.writeFile(this.fileInfo.path, body, 'binary', this.writeFileCallback)
                } else {
                    fs.writeFile(path.join(dest, "README.txt"), `Disk usage is too high, so unsaved ${this.fileInfo.path}`, {
                        flag: "a+"
                    }, this.writeFileCallback)
                }
            }
        }
    }

    _RejectOrResolve(resolve, reject) {
        const {
            uri,
            headers
        } = this.downloadParams
        this.promise.resolve = resolve
        this.promise.reject = reject

        request(uri, {
            encoding: 'binary',
            headers: headers || {}
        }, this.requestCallback)
    }
}

function ImageDownloader({
    imgs,
    dest,
    diskLimit = 80
}) {
    if (imgs && dest) {
        if (typeof imgs === 'object' && imgs.length) {
            let Allpromises = []

            for (var i = 0; i < imgs.length; i++) {
                const {
                    uri,
                    filename,
                    fileExtension,
                    headers
                } = imgs[i]
                const handdle = new PromisseHandle({
                    uri,
                    filename,
                    fileExtension,
                    dest,
                    headers,
                    diskLimit
                })
                Allpromises.push(new Promise(handdle.RejectOrResolve))
            }

            return Promise.all(Allpromises)
        }
    } else {
        throw new TypeError('imgs and dest params is required')
    }
}

module.exports = ImageDownloader