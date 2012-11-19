(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",Function(['require','module','exports','__dirname','__filename','process','global'],"function filter (xs, fn) {\n    var res = [];\n    for (var i = 0; i < xs.length; i++) {\n        if (fn(xs[i], i, xs)) res.push(xs[i]);\n    }\n    return res;\n}\n\n// resolves . and .. elements in a path array with directory names there\n// must be no slashes, empty elements, or device names (c:\\) in the array\n// (so also no leading and trailing slashes - it does not distinguish\n// relative and absolute paths)\nfunction normalizeArray(parts, allowAboveRoot) {\n  // if the path tries to go above the root, `up` ends up > 0\n  var up = 0;\n  for (var i = parts.length; i >= 0; i--) {\n    var last = parts[i];\n    if (last == '.') {\n      parts.splice(i, 1);\n    } else if (last === '..') {\n      parts.splice(i, 1);\n      up++;\n    } else if (up) {\n      parts.splice(i, 1);\n      up--;\n    }\n  }\n\n  // if the path is allowed to go above the root, restore leading ..s\n  if (allowAboveRoot) {\n    for (; up--; up) {\n      parts.unshift('..');\n    }\n  }\n\n  return parts;\n}\n\n// Regex to split a filename into [*, dir, basename, ext]\n// posix version\nvar splitPathRe = /^(.+\\/(?!$)|\\/)?((?:.+?)?(\\.[^.]*)?)$/;\n\n// path.resolve([from ...], to)\n// posix version\nexports.resolve = function() {\nvar resolvedPath = '',\n    resolvedAbsolute = false;\n\nfor (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {\n  var path = (i >= 0)\n      ? arguments[i]\n      : process.cwd();\n\n  // Skip empty and invalid entries\n  if (typeof path !== 'string' || !path) {\n    continue;\n  }\n\n  resolvedPath = path + '/' + resolvedPath;\n  resolvedAbsolute = path.charAt(0) === '/';\n}\n\n// At this point the path should be resolved to a full absolute path, but\n// handle relative paths to be safe (might happen when process.cwd() fails)\n\n// Normalize the path\nresolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {\n    return !!p;\n  }), !resolvedAbsolute).join('/');\n\n  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';\n};\n\n// path.normalize(path)\n// posix version\nexports.normalize = function(path) {\nvar isAbsolute = path.charAt(0) === '/',\n    trailingSlash = path.slice(-1) === '/';\n\n// Normalize the path\npath = normalizeArray(filter(path.split('/'), function(p) {\n    return !!p;\n  }), !isAbsolute).join('/');\n\n  if (!path && !isAbsolute) {\n    path = '.';\n  }\n  if (path && trailingSlash) {\n    path += '/';\n  }\n  \n  return (isAbsolute ? '/' : '') + path;\n};\n\n\n// posix version\nexports.join = function() {\n  var paths = Array.prototype.slice.call(arguments, 0);\n  return exports.normalize(filter(paths, function(p, index) {\n    return p && typeof p === 'string';\n  }).join('/'));\n};\n\n\nexports.dirname = function(path) {\n  var dir = splitPathRe.exec(path)[1] || '';\n  var isWindows = false;\n  if (!dir) {\n    // No dirname\n    return '.';\n  } else if (dir.length === 1 ||\n      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {\n    // It is just a slash or a drive letter with a slash\n    return dir;\n  } else {\n    // It is a full dirname, strip trailing slash\n    return dir.substring(0, dir.length - 1);\n  }\n};\n\n\nexports.basename = function(path, ext) {\n  var f = splitPathRe.exec(path)[2] || '';\n  // TODO: make this comparison case-insensitive on windows?\n  if (ext && f.substr(-1 * ext.length) === ext) {\n    f = f.substr(0, f.length - ext.length);\n  }\n  return f;\n};\n\n\nexports.extname = function(path) {\n  return splitPathRe.exec(path)[3] || '';\n};\n\n//@ sourceURL=path"
));

require.define("__browserify_process",Function(['require','module','exports','__dirname','__filename','process','global'],"var process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n        && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n        && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return function (f) { return window.setImmediate(f) };\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'browserify-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('browserify-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    if (name === 'evals') return (require)('vm')\n    else throw new Error('No such module. (Possibly not yet loaded)')\n};\n\n(function () {\n    var cwd = '/';\n    var path;\n    process.cwd = function () { return cwd };\n    process.chdir = function (dir) {\n        if (!path) path = require('path');\n        cwd = path.resolve(dir, cwd);\n    };\n})();\n\n//@ sourceURL=__browserify_process"
));

require.define("/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"index.js\",\"browserify\":\"browser.js\"}\n//@ sourceURL=/package.json"
));

require.define("http",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = require(\"http-browserify\")\n//@ sourceURL=http"
));

require.define("/node_modules/http-browserify/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"index.js\",\"browserify\":\"index.js\"}\n//@ sourceURL=/node_modules/http-browserify/package.json"
));

require.define("/node_modules/http-browserify/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var http = module.exports;\nvar EventEmitter = require('events').EventEmitter;\nvar Request = require('./lib/request');\n\nhttp.request = function (params, cb) {\n    if (!params) params = {};\n    if (!params.host) params.host = window.location.host.split(':')[0];\n    if (!params.port) params.port = window.location.port;\n    \n    var req = new Request(new xhrHttp, params);\n    if (cb) req.on('response', cb);\n    return req;\n};\n\nhttp.get = function (params, cb) {\n    params.method = 'GET';\n    var req = http.request(params, cb);\n    req.end();\n    return req;\n};\n\nhttp.Agent = function () {};\nhttp.Agent.defaultMaxSockets = 4;\n\nvar xhrHttp = (function () {\n    if (typeof window === 'undefined') {\n        throw new Error('no window object present');\n    }\n    else if (window.XMLHttpRequest) {\n        return window.XMLHttpRequest;\n    }\n    else if (window.ActiveXObject) {\n        var axs = [\n            'Msxml2.XMLHTTP.6.0',\n            'Msxml2.XMLHTTP.3.0',\n            'Microsoft.XMLHTTP'\n        ];\n        for (var i = 0; i < axs.length; i++) {\n            try {\n                var ax = new(window.ActiveXObject)(axs[i]);\n                return function () {\n                    if (ax) {\n                        var ax_ = ax;\n                        ax = null;\n                        return ax_;\n                    }\n                    else {\n                        return new(window.ActiveXObject)(axs[i]);\n                    }\n                };\n            }\n            catch (e) {}\n        }\n        throw new Error('ajax not supported in this browser')\n    }\n    else {\n        throw new Error('ajax not supported in this browser');\n    }\n})();\n\n//@ sourceURL=/node_modules/http-browserify/index.js"
));

require.define("events",Function(['require','module','exports','__dirname','__filename','process','global'],"if (!process.EventEmitter) process.EventEmitter = function () {};\n\nvar EventEmitter = exports.EventEmitter = process.EventEmitter;\nvar isArray = typeof Array.isArray === 'function'\n    ? Array.isArray\n    : function (xs) {\n        return Object.prototype.toString.call(xs) === '[object Array]'\n    }\n;\n\n// By default EventEmitters will print a warning if more than\n// 10 listeners are added to it. This is a useful default which\n// helps finding memory leaks.\n//\n// Obviously not all Emitters should be limited to 10. This function allows\n// that to be increased. Set to zero for unlimited.\nvar defaultMaxListeners = 10;\nEventEmitter.prototype.setMaxListeners = function(n) {\n  if (!this._events) this._events = {};\n  this._events.maxListeners = n;\n};\n\n\nEventEmitter.prototype.emit = function(type) {\n  // If there is no 'error' event listener then throw.\n  if (type === 'error') {\n    if (!this._events || !this._events.error ||\n        (isArray(this._events.error) && !this._events.error.length))\n    {\n      if (arguments[1] instanceof Error) {\n        throw arguments[1]; // Unhandled 'error' event\n      } else {\n        throw new Error(\"Uncaught, unspecified 'error' event.\");\n      }\n      return false;\n    }\n  }\n\n  if (!this._events) return false;\n  var handler = this._events[type];\n  if (!handler) return false;\n\n  if (typeof handler == 'function') {\n    switch (arguments.length) {\n      // fast cases\n      case 1:\n        handler.call(this);\n        break;\n      case 2:\n        handler.call(this, arguments[1]);\n        break;\n      case 3:\n        handler.call(this, arguments[1], arguments[2]);\n        break;\n      // slower\n      default:\n        var args = Array.prototype.slice.call(arguments, 1);\n        handler.apply(this, args);\n    }\n    return true;\n\n  } else if (isArray(handler)) {\n    var args = Array.prototype.slice.call(arguments, 1);\n\n    var listeners = handler.slice();\n    for (var i = 0, l = listeners.length; i < l; i++) {\n      listeners[i].apply(this, args);\n    }\n    return true;\n\n  } else {\n    return false;\n  }\n};\n\n// EventEmitter is defined in src/node_events.cc\n// EventEmitter.prototype.emit() is also defined there.\nEventEmitter.prototype.addListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('addListener only takes instances of Function');\n  }\n\n  if (!this._events) this._events = {};\n\n  // To avoid recursion in the case that type == \"newListeners\"! Before\n  // adding it to the listeners, first emit \"newListeners\".\n  this.emit('newListener', type, listener);\n\n  if (!this._events[type]) {\n    // Optimize the case of one listener. Don't need the extra array object.\n    this._events[type] = listener;\n  } else if (isArray(this._events[type])) {\n\n    // Check for listener leak\n    if (!this._events[type].warned) {\n      var m;\n      if (this._events.maxListeners !== undefined) {\n        m = this._events.maxListeners;\n      } else {\n        m = defaultMaxListeners;\n      }\n\n      if (m && m > 0 && this._events[type].length > m) {\n        this._events[type].warned = true;\n        console.error('(node) warning: possible EventEmitter memory ' +\n                      'leak detected. %d listeners added. ' +\n                      'Use emitter.setMaxListeners() to increase limit.',\n                      this._events[type].length);\n        console.trace();\n      }\n    }\n\n    // If we've already got an array, just append.\n    this._events[type].push(listener);\n  } else {\n    // Adding the second element, need to change to array.\n    this._events[type] = [this._events[type], listener];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.on = EventEmitter.prototype.addListener;\n\nEventEmitter.prototype.once = function(type, listener) {\n  var self = this;\n  self.on(type, function g() {\n    self.removeListener(type, g);\n    listener.apply(this, arguments);\n  });\n\n  return this;\n};\n\nEventEmitter.prototype.removeListener = function(type, listener) {\n  if ('function' !== typeof listener) {\n    throw new Error('removeListener only takes instances of Function');\n  }\n\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (!this._events || !this._events[type]) return this;\n\n  var list = this._events[type];\n\n  if (isArray(list)) {\n    var i = list.indexOf(listener);\n    if (i < 0) return this;\n    list.splice(i, 1);\n    if (list.length == 0)\n      delete this._events[type];\n  } else if (this._events[type] === listener) {\n    delete this._events[type];\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.removeAllListeners = function(type) {\n  // does not use listeners(), so no side effect of creating _events[type]\n  if (type && this._events && this._events[type]) this._events[type] = null;\n  return this;\n};\n\nEventEmitter.prototype.listeners = function(type) {\n  if (!this._events) this._events = {};\n  if (!this._events[type]) this._events[type] = [];\n  if (!isArray(this._events[type])) {\n    this._events[type] = [this._events[type]];\n  }\n  return this._events[type];\n};\n\n//@ sourceURL=events"
));

require.define("/node_modules/http-browserify/lib/request.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var Stream = require('stream');\nvar Response = require('./response');\nvar concatStream = require('concat-stream')\n\nvar Request = module.exports = function (xhr, params) {\n    var self = this;\n    self.writable = true;\n    self.xhr = xhr;\n    self.body = concatStream()\n    \n    var uri = params.host + ':' + params.port + (params.path || '/');\n    \n    xhr.open(\n        params.method || 'GET',\n        (params.scheme || 'http') + '://' + uri,\n        true\n    );\n    \n    if (params.headers) {\n        Object.keys(params.headers).forEach(function (key) {\n            if (!self.isSafeRequestHeader(key)) return;\n            var value = params.headers[key];\n            if (Array.isArray(value)) {\n                value.forEach(function (v) {\n                    xhr.setRequestHeader(key, v);\n                });\n            }\n            else xhr.setRequestHeader(key, value)\n        });\n    }\n    \n    var res = new Response;\n    res.on('ready', function () {\n        self.emit('response', res);\n    });\n    \n    xhr.onreadystatechange = function () {\n        res.handle(xhr);\n    };\n};\n\nRequest.prototype = new Stream;\n\nRequest.prototype.setHeader = function (key, value) {\n    if ((Array.isArray && Array.isArray(value))\n    || value instanceof Array) {\n        for (var i = 0; i < value.length; i++) {\n            this.xhr.setRequestHeader(key, value[i]);\n        }\n    }\n    else {\n        this.xhr.setRequestHeader(key, value);\n    }\n};\n\nRequest.prototype.write = function (s) {\n    this.body.write(s);\n};\n\nRequest.prototype.end = function (s) {\n    if (s !== undefined) this.body.write(s);\n    this.body.end()\n    this.xhr.send(this.body.getBody());\n};\n\n// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html\nRequest.unsafeHeaders = [\n    \"accept-charset\",\n    \"accept-encoding\",\n    \"access-control-request-headers\",\n    \"access-control-request-method\",\n    \"connection\",\n    \"content-length\",\n    \"cookie\",\n    \"cookie2\",\n    \"content-transfer-encoding\",\n    \"date\",\n    \"expect\",\n    \"host\",\n    \"keep-alive\",\n    \"origin\",\n    \"referer\",\n    \"te\",\n    \"trailer\",\n    \"transfer-encoding\",\n    \"upgrade\",\n    \"user-agent\",\n    \"via\"\n];\n\nRequest.prototype.isSafeRequestHeader = function (headerName) {\n    if (!headerName) return false;\n    return (Request.unsafeHeaders.indexOf(headerName.toLowerCase()) === -1)\n};\n\n//@ sourceURL=/node_modules/http-browserify/lib/request.js"
));

require.define("stream",Function(['require','module','exports','__dirname','__filename','process','global'],"var events = require('events');\nvar util = require('util');\n\nfunction Stream() {\n  events.EventEmitter.call(this);\n}\nutil.inherits(Stream, events.EventEmitter);\nmodule.exports = Stream;\n// Backwards-compat with node 0.4.x\nStream.Stream = Stream;\n\nStream.prototype.pipe = function(dest, options) {\n  var source = this;\n\n  function ondata(chunk) {\n    if (dest.writable) {\n      if (false === dest.write(chunk) && source.pause) {\n        source.pause();\n      }\n    }\n  }\n\n  source.on('data', ondata);\n\n  function ondrain() {\n    if (source.readable && source.resume) {\n      source.resume();\n    }\n  }\n\n  dest.on('drain', ondrain);\n\n  // If the 'end' option is not supplied, dest.end() will be called when\n  // source gets the 'end' or 'close' events.  Only dest.end() once, and\n  // only when all sources have ended.\n  if (!dest._isStdio && (!options || options.end !== false)) {\n    dest._pipeCount = dest._pipeCount || 0;\n    dest._pipeCount++;\n\n    source.on('end', onend);\n    source.on('close', onclose);\n  }\n\n  var didOnEnd = false;\n  function onend() {\n    if (didOnEnd) return;\n    didOnEnd = true;\n\n    dest._pipeCount--;\n\n    // remove the listeners\n    cleanup();\n\n    if (dest._pipeCount > 0) {\n      // waiting for other incoming streams to end.\n      return;\n    }\n\n    dest.end();\n  }\n\n\n  function onclose() {\n    if (didOnEnd) return;\n    didOnEnd = true;\n\n    dest._pipeCount--;\n\n    // remove the listeners\n    cleanup();\n\n    if (dest._pipeCount > 0) {\n      // waiting for other incoming streams to end.\n      return;\n    }\n\n    dest.destroy();\n  }\n\n  // don't leave dangling pipes when there are errors.\n  function onerror(er) {\n    cleanup();\n    if (this.listeners('error').length === 0) {\n      throw er; // Unhandled stream error in pipe.\n    }\n  }\n\n  source.on('error', onerror);\n  dest.on('error', onerror);\n\n  // remove all the event listeners that were added.\n  function cleanup() {\n    source.removeListener('data', ondata);\n    dest.removeListener('drain', ondrain);\n\n    source.removeListener('end', onend);\n    source.removeListener('close', onclose);\n\n    source.removeListener('error', onerror);\n    dest.removeListener('error', onerror);\n\n    source.removeListener('end', cleanup);\n    source.removeListener('close', cleanup);\n\n    dest.removeListener('end', cleanup);\n    dest.removeListener('close', cleanup);\n  }\n\n  source.on('end', cleanup);\n  source.on('close', cleanup);\n\n  dest.on('end', cleanup);\n  dest.on('close', cleanup);\n\n  dest.emit('pipe', source);\n\n  // Allow for unix-like usage: A.pipe(B).pipe(C)\n  return dest;\n};\n\n//@ sourceURL=stream"
));

require.define("util",Function(['require','module','exports','__dirname','__filename','process','global'],"var events = require('events');\n\nexports.print = function () {};\nexports.puts = function () {};\nexports.debug = function() {};\n\nexports.inspect = function(obj, showHidden, depth, colors) {\n  var seen = [];\n\n  var stylize = function(str, styleType) {\n    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics\n    var styles =\n        { 'bold' : [1, 22],\n          'italic' : [3, 23],\n          'underline' : [4, 24],\n          'inverse' : [7, 27],\n          'white' : [37, 39],\n          'grey' : [90, 39],\n          'black' : [30, 39],\n          'blue' : [34, 39],\n          'cyan' : [36, 39],\n          'green' : [32, 39],\n          'magenta' : [35, 39],\n          'red' : [31, 39],\n          'yellow' : [33, 39] };\n\n    var style =\n        { 'special': 'cyan',\n          'number': 'blue',\n          'boolean': 'yellow',\n          'undefined': 'grey',\n          'null': 'bold',\n          'string': 'green',\n          'date': 'magenta',\n          // \"name\": intentionally not styling\n          'regexp': 'red' }[styleType];\n\n    if (style) {\n      return '\\033[' + styles[style][0] + 'm' + str +\n             '\\033[' + styles[style][1] + 'm';\n    } else {\n      return str;\n    }\n  };\n  if (! colors) {\n    stylize = function(str, styleType) { return str; };\n  }\n\n  function format(value, recurseTimes) {\n    // Provide a hook for user-specified inspect functions.\n    // Check that value is an object with an inspect function on it\n    if (value && typeof value.inspect === 'function' &&\n        // Filter out the util module, it's inspect function is special\n        value !== exports &&\n        // Also filter out any prototype objects using the circular check.\n        !(value.constructor && value.constructor.prototype === value)) {\n      return value.inspect(recurseTimes);\n    }\n\n    // Primitive types cannot have properties\n    switch (typeof value) {\n      case 'undefined':\n        return stylize('undefined', 'undefined');\n\n      case 'string':\n        var simple = '\\'' + JSON.stringify(value).replace(/^\"|\"$/g, '')\n                                                 .replace(/'/g, \"\\\\'\")\n                                                 .replace(/\\\\\"/g, '\"') + '\\'';\n        return stylize(simple, 'string');\n\n      case 'number':\n        return stylize('' + value, 'number');\n\n      case 'boolean':\n        return stylize('' + value, 'boolean');\n    }\n    // For some reason typeof null is \"object\", so special case here.\n    if (value === null) {\n      return stylize('null', 'null');\n    }\n\n    // Look up the keys of the object.\n    var visible_keys = Object_keys(value);\n    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;\n\n    // Functions without properties can be shortcutted.\n    if (typeof value === 'function' && keys.length === 0) {\n      if (isRegExp(value)) {\n        return stylize('' + value, 'regexp');\n      } else {\n        var name = value.name ? ': ' + value.name : '';\n        return stylize('[Function' + name + ']', 'special');\n      }\n    }\n\n    // Dates without properties can be shortcutted\n    if (isDate(value) && keys.length === 0) {\n      return stylize(value.toUTCString(), 'date');\n    }\n\n    var base, type, braces;\n    // Determine the object type\n    if (isArray(value)) {\n      type = 'Array';\n      braces = ['[', ']'];\n    } else {\n      type = 'Object';\n      braces = ['{', '}'];\n    }\n\n    // Make functions say that they are functions\n    if (typeof value === 'function') {\n      var n = value.name ? ': ' + value.name : '';\n      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';\n    } else {\n      base = '';\n    }\n\n    // Make dates with properties first say the date\n    if (isDate(value)) {\n      base = ' ' + value.toUTCString();\n    }\n\n    if (keys.length === 0) {\n      return braces[0] + base + braces[1];\n    }\n\n    if (recurseTimes < 0) {\n      if (isRegExp(value)) {\n        return stylize('' + value, 'regexp');\n      } else {\n        return stylize('[Object]', 'special');\n      }\n    }\n\n    seen.push(value);\n\n    var output = keys.map(function(key) {\n      var name, str;\n      if (value.__lookupGetter__) {\n        if (value.__lookupGetter__(key)) {\n          if (value.__lookupSetter__(key)) {\n            str = stylize('[Getter/Setter]', 'special');\n          } else {\n            str = stylize('[Getter]', 'special');\n          }\n        } else {\n          if (value.__lookupSetter__(key)) {\n            str = stylize('[Setter]', 'special');\n          }\n        }\n      }\n      if (visible_keys.indexOf(key) < 0) {\n        name = '[' + key + ']';\n      }\n      if (!str) {\n        if (seen.indexOf(value[key]) < 0) {\n          if (recurseTimes === null) {\n            str = format(value[key]);\n          } else {\n            str = format(value[key], recurseTimes - 1);\n          }\n          if (str.indexOf('\\n') > -1) {\n            if (isArray(value)) {\n              str = str.split('\\n').map(function(line) {\n                return '  ' + line;\n              }).join('\\n').substr(2);\n            } else {\n              str = '\\n' + str.split('\\n').map(function(line) {\n                return '   ' + line;\n              }).join('\\n');\n            }\n          }\n        } else {\n          str = stylize('[Circular]', 'special');\n        }\n      }\n      if (typeof name === 'undefined') {\n        if (type === 'Array' && key.match(/^\\d+$/)) {\n          return str;\n        }\n        name = JSON.stringify('' + key);\n        if (name.match(/^\"([a-zA-Z_][a-zA-Z_0-9]*)\"$/)) {\n          name = name.substr(1, name.length - 2);\n          name = stylize(name, 'name');\n        } else {\n          name = name.replace(/'/g, \"\\\\'\")\n                     .replace(/\\\\\"/g, '\"')\n                     .replace(/(^\"|\"$)/g, \"'\");\n          name = stylize(name, 'string');\n        }\n      }\n\n      return name + ': ' + str;\n    });\n\n    seen.pop();\n\n    var numLinesEst = 0;\n    var length = output.reduce(function(prev, cur) {\n      numLinesEst++;\n      if (cur.indexOf('\\n') >= 0) numLinesEst++;\n      return prev + cur.length + 1;\n    }, 0);\n\n    if (length > 50) {\n      output = braces[0] +\n               (base === '' ? '' : base + '\\n ') +\n               ' ' +\n               output.join(',\\n  ') +\n               ' ' +\n               braces[1];\n\n    } else {\n      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];\n    }\n\n    return output;\n  }\n  return format(obj, (typeof depth === 'undefined' ? 2 : depth));\n};\n\n\nfunction isArray(ar) {\n  return ar instanceof Array ||\n         Array.isArray(ar) ||\n         (ar && ar !== Object.prototype && isArray(ar.__proto__));\n}\n\n\nfunction isRegExp(re) {\n  return re instanceof RegExp ||\n    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');\n}\n\n\nfunction isDate(d) {\n  if (d instanceof Date) return true;\n  if (typeof d !== 'object') return false;\n  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);\n  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);\n  return JSON.stringify(proto) === JSON.stringify(properties);\n}\n\nfunction pad(n) {\n  return n < 10 ? '0' + n.toString(10) : n.toString(10);\n}\n\nvar months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',\n              'Oct', 'Nov', 'Dec'];\n\n// 26 Feb 16:19:34\nfunction timestamp() {\n  var d = new Date();\n  var time = [pad(d.getHours()),\n              pad(d.getMinutes()),\n              pad(d.getSeconds())].join(':');\n  return [d.getDate(), months[d.getMonth()], time].join(' ');\n}\n\nexports.log = function (msg) {};\n\nexports.pump = null;\n\nvar Object_keys = Object.keys || function (obj) {\n    var res = [];\n    for (var key in obj) res.push(key);\n    return res;\n};\n\nvar Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {\n    var res = [];\n    for (var key in obj) {\n        if (Object.hasOwnProperty.call(obj, key)) res.push(key);\n    }\n    return res;\n};\n\nvar Object_create = Object.create || function (prototype, properties) {\n    // from es5-shim\n    var object;\n    if (prototype === null) {\n        object = { '__proto__' : null };\n    }\n    else {\n        if (typeof prototype !== 'object') {\n            throw new TypeError(\n                'typeof prototype[' + (typeof prototype) + '] != \\'object\\''\n            );\n        }\n        var Type = function () {};\n        Type.prototype = prototype;\n        object = new Type();\n        object.__proto__ = prototype;\n    }\n    if (typeof properties !== 'undefined' && Object.defineProperties) {\n        Object.defineProperties(object, properties);\n    }\n    return object;\n};\n\nexports.inherits = function(ctor, superCtor) {\n  ctor.super_ = superCtor;\n  ctor.prototype = Object_create(superCtor.prototype, {\n    constructor: {\n      value: ctor,\n      enumerable: false,\n      writable: true,\n      configurable: true\n    }\n  });\n};\n\nvar formatRegExp = /%[sdj%]/g;\nexports.format = function(f) {\n  if (typeof f !== 'string') {\n    var objects = [];\n    for (var i = 0; i < arguments.length; i++) {\n      objects.push(exports.inspect(arguments[i]));\n    }\n    return objects.join(' ');\n  }\n\n  var i = 1;\n  var args = arguments;\n  var len = args.length;\n  var str = String(f).replace(formatRegExp, function(x) {\n    if (x === '%%') return '%';\n    if (i >= len) return x;\n    switch (x) {\n      case '%s': return String(args[i++]);\n      case '%d': return Number(args[i++]);\n      case '%j': return JSON.stringify(args[i++]);\n      default:\n        return x;\n    }\n  });\n  for(var x = args[i]; i < len; x = args[++i]){\n    if (x === null || typeof x !== 'object') {\n      str += ' ' + x;\n    } else {\n      str += ' ' + exports.inspect(x);\n    }\n  }\n  return str;\n};\n\n//@ sourceURL=util"
));

require.define("/node_modules/http-browserify/lib/response.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var Stream = require('stream');\n\nvar Response = module.exports = function (res) {\n    this.offset = 0;\n    this.readable = true;\n};\n\nResponse.prototype = new Stream;\n\nvar capable = {\n    streaming : true,\n    status2 : true\n};\n\nfunction parseHeaders (res) {\n    var lines = res.getAllResponseHeaders().split(/\\r?\\n/);\n    var headers = {};\n    for (var i = 0; i < lines.length; i++) {\n        var line = lines[i];\n        if (line === '') continue;\n        \n        var m = line.match(/^([^:]+):\\s*(.*)/);\n        if (m) {\n            var key = m[1].toLowerCase(), value = m[2];\n            \n            if (headers[key] !== undefined) {\n                if ((Array.isArray && Array.isArray(headers[key]))\n                || headers[key] instanceof Array) {\n                    headers[key].push(value);\n                }\n                else {\n                    headers[key] = [ headers[key], value ];\n                }\n            }\n            else {\n                headers[key] = value;\n            }\n        }\n        else {\n            headers[line] = true;\n        }\n    }\n    return headers;\n}\n\nResponse.prototype.getResponse = function (xhr) {\n    var respType = xhr.responseType.toLowerCase();\n    if (respType === \"blob\") return xhr.responseBlob;\n    if (respType === \"arraybuffer\") return xhr.response;\n    return xhr.responseText;\n}\n\nResponse.prototype.getHeader = function (key) {\n    return this.headers[key.toLowerCase()];\n};\n\nResponse.prototype.handle = function (res) {\n    if (res.readyState === 2 && capable.status2) {\n        try {\n            this.statusCode = res.status;\n            this.headers = parseHeaders(res);\n        }\n        catch (err) {\n            capable.status2 = false;\n        }\n        \n        if (capable.status2) {\n            this.emit('ready');\n        }\n    }\n    else if (capable.streaming && res.readyState === 3) {\n        try {\n            if (!this.statusCode) {\n                this.statusCode = res.status;\n                this.headers = parseHeaders(res);\n                this.emit('ready');\n            }\n        }\n        catch (err) {}\n        \n        try {\n            this.write(res);\n        }\n        catch (err) {\n            capable.streaming = false;\n        }\n    }\n    else if (res.readyState === 4) {\n        if (!this.statusCode) {\n            this.statusCode = res.status;\n            this.emit('ready');\n        }\n        this.write(res);\n        \n        if (res.error) {\n            this.emit('error', this.getResponse(res));\n        }\n        else this.emit('end');\n    }\n};\n\nResponse.prototype.write = function (res) {\n    var respBody = this.getResponse(res);\n    if (respBody.toString().match(/ArrayBuffer/)) {\n        this.emit('data', new Uint8Array(respBody, this.offset));\n        this.offset = respBody.byteLength;\n        return;\n    }\n    if (respBody.length > this.offset) {\n        this.emit('data', respBody.slice(this.offset));\n        this.offset = respBody.length;\n    }\n};\n\n//@ sourceURL=/node_modules/http-browserify/lib/response.js"
));

require.define("/node_modules/http-browserify/node_modules/concat-stream/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {}\n//@ sourceURL=/node_modules/http-browserify/node_modules/concat-stream/package.json"
));

require.define("/node_modules/http-browserify/node_modules/concat-stream/index.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var stream = require('stream')\nvar util = require('util')\n\nfunction ConcatStream(cb) {\n  stream.Stream.call(this)\n  this.writable = true\n  if (cb) this.cb = cb\n  this.body = []\n  if (this.cb) this.on('error', cb)\n}\n\nutil.inherits(ConcatStream, stream.Stream)\n\nConcatStream.prototype.write = function(chunk) {\n  this.body.push(chunk)\n}\n\nConcatStream.prototype.arrayConcat = function(arrs) {\n  if (arrs.length === 0) return []\n  if (arrs.length === 1) return arrs[0]\n  return arrs.reduce(function (a, b) { return a.concat(b) })\n}\n\nConcatStream.prototype.isArray = function(arr) {\n  var isArray = Array.isArray(arr)\n  var isTypedArray = arr.toString().match(/Array/)\n  return isArray || isTypedArray\n}\n\nConcatStream.prototype.getBody = function () {\n  if (this.body.length === 0) return\n  if (typeof(this.body[0]) === \"string\") return this.body.join('')\n  if (this.isArray(this.body[0])) return this.arrayConcat(this.body)\n  if (typeof(Buffer) !== \"undefined\" && Buffer.isBuffer(this.body[0])) {\n    return Buffer.concat(this.body)\n  }\n  return this.body\n}\n\nConcatStream.prototype.end = function() {\n  if (this.cb) this.cb(false, this.getBody())\n}\n\nmodule.exports = function(cb) {\n  return new ConcatStream(cb)\n}\n\nmodule.exports.ConcatStream = ConcatStream\n\n//@ sourceURL=/node_modules/http-browserify/node_modules/concat-stream/index.js"
));

require.define("/browser.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var http = require('http');\nvar Stream = require('stream');\nvar encode = typeof encodeURIComponent !== 'undefined'\n    ? encodeURIComponent : escape\n;\n\nmodule.exports = function (opts) {\n    if (typeof opts === 'string') {\n        opts = { path : opts };\n    }\n    if (!opts) opts = {};\n    if (!opts.id) {\n        opts.id = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);\n    }\n    \n    var stream = new Stream;\n    stream.writable = true;\n    stream.order = 0;\n    \n    stream.write = function (msg) {\n        if (stream.ended) return;\n        \n        var params = {\n            method : 'POST',\n            host : opts.host || window.location.hostname,\n            port : opts.port || window.location.port,\n            path : opts.path || '/',\n            headers : {\n                'content-type' : 'application/x-www-form-urlencoded'\n            }\n        };\n        var req = http.request(params);\n        var data = 'order=' + stream.order\n            + '&data=' + encode(msg)\n            + '&id=' + encode(opts.id)\n        ;\n        req.end(data);\n        stream.order ++;\n    };\n    \n    stream.end = function () {\n        if (stream.ended) return;\n        stream.order = -1;\n        //write(-1);\n        stream.ended = true;\n    };\n    \n    return stream\n};\n\n//@ sourceURL=/browser.js"
));

require.define("/example/browser.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var xws = require('../');\nvar ws = xws('/robots');\nws.write('beep\\n');\nws.write('boop\\n');\nws.end();\n\n//@ sourceURL=/example/browser.js"
));
require("/example/browser.js");
})();
