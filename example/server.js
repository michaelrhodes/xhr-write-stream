var http = require('http');
var ecstatic = require('ecstatic')(__dirname + '/static');
var xws = require('../')();

var server = http.createServer(function (req, res) {
    if (req.url === '/robots') {
        xws(req, function (stream) {
            stream.pipe(process.stdout, { end : false });
            stream.on('end', function () {
                res.write('ok\n');
                res.end();
            });
        });
    }
    else ecstatic(req, res)
});
server.listen(5000);
