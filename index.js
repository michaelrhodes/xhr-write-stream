var qs = require('querystring');
var OrderedEmitter = require('ordered-emitter');
var Stream = require('stream');

module.exports = function (cb) {
    var ord = new OrderedEmitter;
    var streams = {};
    
    function parse (req) {
        
        function write (buf) {
            data += buf;
        }
        
        function end () {
            var params = qs.parse(data);
            if (!requests[id]) requests[id]
            console.dir(params);
        }
        return stream;
    }
    
    return function (req, cb) {
        var data = '';
        
        req.on('data', function (buf) {
            data += buf;
        });
        
        req.on('end', function () {
            var params = qs.parse(data);
            if (!params) return;
            
            if (!streams[params.id]) {
                var s = streams[params.id] = new Stream;
                
                s.ordered = new OrderedEmitter;
                s.ordered.on('params', function (params) {
                    if (params.data !== undefined) s.emit('data', params.data)
                    if (params.end) {
                        s.emit('end');
                        s.emit('close');
                    }
                });
                
                s.readable = true;
                cb(s);
            }
            streams[params.id].ordered.emit('params', params);
        });
    };
};
