/*!
 * A small application that provides images for asynchronous downloads.
 * Copyright 2019, MIT LICENSE.
 */

const host = "127.0.0.1"
const port = 3000

var express = require('express');
var app = express();

app.get('/ping', function (req, res) {
    res.json({
        msg: 'Hello World!'
    });
});

app.listen(port, host, function () {
    console.log(`Server running at http://${host}:${port}`);
});