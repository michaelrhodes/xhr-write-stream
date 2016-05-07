var stream = require('stream-mixin');
var encode = typeof encodeURIComponent !== 'undefined' ?
    encodeURIComponent :
    escape;

module.exports = function (opts) {
    if (typeof opts === 'string') {
        opts = { path : opts };
    }
    if (!opts) opts = {};
    if (!opts.id) {
        opts.id = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
    }
    
    var results = {};
    stream.call(results);
    results.writable = true;
    results.order = 0;
    
    results.write = function (msg) {
        if (results.ended) return;
        var data = 'order=' + results.order
            + '&data=' + encode(msg)
            + '&id=' + encode(opts.id);
        
        results.order++;
        send(data);
    };
    
    results.destroy = function () {
        results.ended = true;
        results.emit('close');
    };
    
    results.end = function (msg) {
        if (results.ended) return;
        
        var data = 'order=' + results.order
            + '&id=' + encode(opts.id)
            + '&end=true';
        
        if (msg !== undefined) {
          data += '&data=' + encode(msg);
        }
        results.order++;
        send(data);
        results.ended = true;
    };

    function send (data) {
        if (!data) return;
        var xhr = XHR();
        xhr.open('POST', opts.path || '/', true);
        xhr.setRequestHeader(
            'Content-Type',
            'application/x-www-form-urlencoded'
        );
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && results.ended) {
            results.emit('close');
          }
        };
        xhr.send(data);
    }

    return results;
}

function XHR () {
    if (typeof XMLHttpRequest !== 'undefined') {
        return new XMLHttpRequest();
    } try {
        return new ActiveXObject('Msxml2.XMLHTTP');
    } catch (e) {}
    try {
        return new ActiveXObject('Msxml3.XMLHTTP');
    } catch (e) {}
    try {
        return new ActiveXObject('Microsoft.XMLHTTP');
    } catch (e) {}
    throw new Error('This browser does not support XMLHttpRequest.');
}
