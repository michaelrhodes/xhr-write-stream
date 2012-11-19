var http = require('http');
var Stream = require('stream');
var encode = typeof encodeURIComponent !== 'undefined'
    ? encodeURIComponent : escape
;

module.exports = function (opts) {
    if (typeof opts === 'string') {
        opts = { path : opts };
    }
    if (!opts) opts = {};
    if (!opts.id) {
        opts.id = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
    }
    
    var stream = new Stream;
    stream.writable = true;
    stream.order = 0;
    
    stream.write = function (msg) {
        if (stream.ended) return;
        
        var params = {
            method : 'POST',
            host : opts.host || window.location.hostname,
            port : opts.port || window.location.port,
            path : opts.path || '/',
            headers : {
                'content-type' : 'application/x-www-form-urlencoded'
            }
        };
        var req = http.request(params);
        var data = 'order=' + stream.order
            + '&data=' + encode(msg)
            + '&id=' + encode(opts.id)
        ;
        req.end(data);
        stream.order ++;
    };
    
    stream.end = function () {
        if (stream.ended) return;
        stream.order = -1;
        //write(-1);
        stream.ended = true;
    };
    
    return stream
};
