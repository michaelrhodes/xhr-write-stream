var xws = require('../');
var ws = xws('/robots');
ws.write('beep\n');
ws.write('boop\n');
ws.end();
