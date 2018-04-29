"use strict";

const WebSocket = require('uws');
const uuid = require('uuid/v4');
const fs = require('fs');
const md5 = require('md5');
const exec = require('child_process').execSync;

const config = {
  port: 4000,
  origin: process.env.NODE_ORIGIN,
  cheatcode: process.env.CHEATCODE,
  pruneInterval: 30,
  charLimit: 1000,
};

console.log('config', config);

process.title = 'editfight';


class Server {

  constructor(options) {
    this.shouldAllow = options.shouldAllow;
    this.port = options.port;
    this.origin = options.origin;
    this.pruneInterval = options.pruneInterval;
    this.commands = {};
    this.ips = {};
    this.ids = {};
    this.ipCount = 0;
  }

  run() {
    console.log(`Running on port ${this.port}`);

    this.wss = new WebSocket.Server({
      port: this.port,
      verifyClient: this.verify.bind(this)
    });

    setInterval(
      this.prune.bind(this),
      this.pruneInterval * 1000
    );

    this.wss.on(
      'connection',
      this.connection.bind(this)
    );
  }

  verify(info) {
    const ip = info.req.headers['x-forwarded-for'];
    console.log(`Verifying ${ip}`);

    if (this.origin && info.origin !== this.origin) {
      console.log(`Rejected ${ip}: bad origin "${info.origin}"`);
      return false;
    }

    if (this.shouldAllow && !this.shouldAllow(ip)) {
      console.log(`Rejected ${ip}: IP rejected`);
      return false;
    }

    console.log(`Accepted ${ip}`);
    return true;
  }

  connection(ws) {
    const ip = ws.upgradeReq.headers['x-forwarded-for'];
    console.log(`Connection from ${ip}`);

    let id = this.ids[ip];
    if (!id) this.ids[ip] = id = Object.keys(this.ids).length + 1;
    ws.id = id;

    ws.ip = ip;
    ws.isAlive = true;
    ws.flags = {};

    this.ips[ws.ip] = (this.ips[ws.ip] || 0) + 1;
    this.ipCount = Object.keys(this.ips).length;

    this.onopen(ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', (code, reason) => {
      this.ips[ws.ip] -= 1;
      if (!this.ips[ws.ip]) delete this.ips[ws.ip];
      this.ipCount = Object.keys(this.ips).length;

      this.onclose(ws);

      console.log(`Disconnected ${ip} with code [${code}] reason [${reason}]`);
    });

    ws.on('error', (error) => {
      console.log(`Error in the websocket server: ${error}`);
    });

    ws.on('message', (message) => {
      console.log(`Received message from IP ${ip}: ${message}`);

      try {
        const json = JSON.parse(message);

        Object.entries(json).forEach(([key, value]) => {
          let cmd = this.commands[key];
          if (cmd) {
            cmd(ws, value);
          }
        })
      }
      catch (e) {
        console.log(`Error: ${e}`);
      }
    });
  }

  prune() {
    this.wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log('Pruning dead connection.');
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping('', false, true);
    })
  }

  send(ws, msg) {
    this.sendTo([ws], msg);
  }

  sendToAll(msg) {
    this.sendTo(this.wss.clients, msg);
  }

  sendTo(clients, msg) {
    const data = (typeof msg === 'string')
      ? msg
      : JSON.stringify(msg);

    const payload = compress(data);
    console.log(`Payload was ${data.length}, is ${payload.length}, saved ${data.length - payload.length} bytes.`);

    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    })
  }

  wsForId(id) {
    let found = null;
    this.wss.clients.forEach(ws => {
      if (ws.id === id) found = ws;
    });
    return found;
  }

  get count() {
    return this.wss.clients.length;
  }

}










class Chat {

  constructor(filename) {
    this.filename = filename;
    this.dirty = false;
    this.messages = [];
  }

  loadIfExists() {
    if (fs.existsSync(this.filename)) {
      this.messages = JSON.parse(fs.readFileSync(this.filename));
      this.dirty = false;
    }
    this.savePeriodically();
  }

  pushMessage(msg) {
    this.messages.push(msg);
    this.messages = this.messages.slice(-200);
    this.dirty = true;
  }

  savePeriodically() {
    setInterval(this.save.bind(this), 5000);
  }

  save() {
    if (!this.dirty) return;
    this.dirty = false;
    console.log(`Saving to "${this.filename}"...`);
    fs.writeFileSync(this.filename, JSON.stringify(this.messages));
  }

}






class Grid {

  constructor(filename) {
    this.filename = filename;
    this.dirty = false;
    this.canvas = 'p'.repeat(100 * 100);
    this.grid = [];
    for (let y = 0; y < 100; y++) {
      const row = [];
      for (let x = 0; x < 100; x++) {
        row.push(0);
      }
      this.grid.push(row);
    }
  }

  loadIfExists() {
    if (fs.existsSync(this.filename)) {
      this.canvas = String(fs.readFileSync(this.filename));
      this.dirty = false;
      for (let i = 0; i < this.canvas.length; i++) {
        const hex = this.canvas.charAt(i);
        const c = parseInt(hex, 32);
        let x = i % 100;
        let y = Math.floor(i / 100);
        this.grid[y][x] = c;
      }
    }
    this.savePeriodically();
  }

  savePeriodically() {
    setInterval(this.save.bind(this), 5000);
  }

  save() {
    if (!this.dirty) return;
    this.dirty = false;
    console.log(`Saving to "${this.filename}"...`);
    fs.writeFileSync(this.filename, this.canvas);
  }

  updatePixel(x, y, c) {
    this.grid[y][x] = c;
    const i = y * 100 + x;
    this.canvas = replaceAt(this.canvas, i, c.toString(32));
    this.dirty = true;
  }

}









class TimeLapse {

  constructor(filename) {
    this.filename = filename;
    this.openForAppending();
    this.q = [];
    this.ready = true;
  }

  openForAppending() {
    this.file = fs.createWriteStream(this.filename, { flags: 'a' });
    this.file.on('error', (e) => { console.log(`Error in event error: ${e}`); this.openForAppending(); });
    this.file.on('finish', (e) => { console.log(`Error in event finish: ${e}`); this.openForAppending(); });
  }

  add(x, y, c) {
    const t = new Date().getTime();
    this.q.push([x, y, c, t]);
    this.writeIfReady();
  }

  writeIfReady() {
    if (this.ready && this.q.length > 0) {
      const [x, y, c, t] = this.q.shift();

      const buffer = Buffer.allocUnsafe(11);
      buffer.writeUInt8(x, 0);
      buffer.writeUInt8(y, 1);
      buffer.writeUInt8(c, 2);
      buffer.writeDoubleLE(t, 3);

      if (!this.file.write(buffer)) {
        this.ready = false;
        this.file.once('drain', () => {
          this.ready = true;
          this.writeIfReady();
        });
      }
      else {
        this.writeIfReady();
      }
    }
  }

  cut() {
    this.file.close();

    const id = new Date().getTime();

    const newFilename = `${this.filename}-${id}`;
    fs.renameSync(this.filename, newFilename);

    const gifname = `gifs/timelapse-${id}.gif`;
    const gif = `./public/${gifname}`;
    exec(`./make-gif ${newFilename} ${gif} 10`);

    this.openForAppending();

    return gifname;
  }

}

















const bans = {};

const server = new Server({
  port: config.port,
  origin: config.origin,
  pruneInterval: config.pruneInterval,
});

const grid = new Grid('./grid');
const chat = new Chat('./chat.json');

const timeLapse = new TimeLapse('./time-lapse');

grid.loadIfExists();
chat.loadIfExists();






server.onopen = (ws) => {
  ws.hash = parseInt(md5(ws.ip), 16);
  server.send(ws, JSON.stringify({
    messages: chat.messages,
    canvas: grid.canvas,
  }));
  server.sendToAll({ count: server.count });
};

server.onclose = (ws) => {
  server.sendToAll({ count: server.count });
};

let batch = [];

setInterval(() => {
  if (batch.length > 0) {
    server.sendToAll({ pixels: batch });
    batch = [];
  }
}, 100);

function setPixel(x, y, c, id, hash) {
  timeLapse.add(x, y, c);
  grid.updatePixel(x, y, c);
  batch.push({ x, y, c, id, hash });
}

function clearGrid() {
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      setPixel(x, y, 25, null, 0);
    }
  }
}



class Vote {

  constructor(server, threshold) {
    this.votes = {};
    this.server = server;
    this.threshold = threshold;
  }

  vote(id) {
    this.votes[id] = true;
    const votes = Object.keys(this.votes).length;
    const need = Math.ceil(this.server.ipCount * this.threshold);
    const passed = votes >= need;
    if (passed) this.votes = {};
    return { passed, votes, need };
  }

}

let gifVotes = new Vote(server, 0.50);

function sendMessage(message) {
  chat.pushMessage(message);
  server.sendToAll({ message });
}

// const waiting = {};
// function throttle(ip) {
//   if (waiting[ip]) return true;
//   waiting[ip] = true;
//   setTimeout(() => {
//     delete waiting[ip];
//   }, 100);
//   return false;
// }

function ban(ip) {
  bans[ip] = true;
  setTimeout(() => {
    delete bans[ip];
  }, 1000 * 60 * 60);
}

function banned(ip) {
  return bans[ip];
}

let kickVotes = {};

const userCommands = {

  gif(ws) {
    const result = gifVotes.vote(ws.ip);
    sendMessage({ text: `Vote cast. Got ${result.votes}, need ${result.need}.`, status: true });
    if (result.passed) {
      sendMessage({ text: "Vote passed. Cutting new gif now!", status: true });
      const gifname = timeLapse.cut();
      clearGrid();
      sendMessage({ text: `Done. Behold: http://editfight.com/${gifname}`, status: true });
    }
  },

  kick(ws, id) {
    id = parseInt(id);
    if (isNaN(id)) return;

    const foundWs = server.wsForId(id);
    const ip = foundWs.ip;
    if (!ip) return;
    if (foundWs.flags.admin) {
      sendMessage({ text: "You can't kick [op].", status: true });
      return;
    }
    if (banned(ip)) return;

    if (ws.flags.admin) {
      sendMessage({ text: "You were kicked by [op] who counts as like 50 votes.", status: true });
      ban(ip);
      return;
    }

    if (!kickVotes[ip]) kickVotes[ip] = {};

    kickVotes[ip][ws.ip] = true;

    const have = Object.keys(kickVotes[ip]).length;
    const need = Math.ceil(server.ipCount * 0.50);
    sendMessage({ text: `Vote cast. Got ${have}, need ${need}.`, status: true });
    if (have >= need) {
      sendMessage({ text: `Vote passed. User banned for 60 minutes!`, status: true });
      ban(ip);
      delete kickVotes[ip];
    }
  }

};

server.commands = {

  [config.cheatcode]: function(ws) {
    ws.flags.admin = true;
  },

  paint(ws, update) {
    // if (throttle(ws.ip)) return;
    if (banned(ws.ip)) return;

    const { x, y, c } = update;

    if (
      typeof (x) !== 'number' ||
      typeof (y) !== 'number' ||
      typeof (c) !== 'number' ||
      x < 0 || x > 99 ||
      y < 0 || y > 99 ||
      c < 0 || c > 31
    ) {
      return;
    }

    setPixel(x, y, c, ws.id, ws.hash);
  },

  text(ws, text) {
    if (banned(ws.ip)) return;

    text = text.trim();

    if (text.length === 0) return;
    if (text.length > config.charLimit) return;

    sendMessage({ text, id: ws.id, hash: ws.hash, ...ws.flags });

    const command = text.match(/^(?:\[[^\]]+\]\s+)?\/(.+)/);
    if (command) {
      const [cmd, ...args] = command[1].split(/\s/);
      const fn = userCommands[cmd.toLowerCase()];
      if (fn) {
        fn(ws, ...args);
      }
    }
  },

};

server.run();













function replaceAt(str, index, replacement) {
  return str.substring(0, index) + replacement + str.substring(index + 1);
}

function hashForString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}








/* lzwCompress.js
 * Copyright (c) 2012-2016 floydpink
 * Licensed under the MIT license. */
var lzw = (function() {
  var root = this;

  var lzwCompress = (function(Array, JSON, undefined) {
    var _self = {},
      _lzwLoggingEnabled = false,
      _lzwLog = function(message) {
        try {
          console.log('lzwCompress: ' +
            (new Date()).toISOString() + ' : ' + (typeof (message) === 'object' ? JSON.stringify(message) : message));
        } catch (e) {
        }
      };

    // KeyOptimize
    // http://stackoverflow.com/questions/4433402/replace-keys-json-in-javascript
    (function(self, Array, JSON) {

      var _keys = [],
        comparer = function(key) {
          return function(e) {
            return e === key;
          };
        },
        inArray = function(array, comparer) {
          for (var i = 0; i < array.length; i++) {
            if (comparer(array[i])) {
              return true;
            }
          }
          return false;
        },
        pushNew = function(array, element, comparer) {
          if (!inArray(array, comparer)) {
            array.push(element);
          }
        },
        _extractKeys = function(obj) {
          if (typeof obj === 'object') {
            for (var key in obj) {
              if (!Array.isArray(obj)) {
                pushNew(_keys, key, comparer(key));
              }
              _extractKeys(obj[key]);
            }
          }
        },
        _encode = function(obj) {
          if (typeof obj !== 'object') {
            return obj;
          }
          for (var prop in obj) {
            if (!Array.isArray(obj)) {
              if (obj.hasOwnProperty(prop)) {
                obj[_keys.indexOf(prop)] = _encode(obj[prop]);
                delete obj[prop];
              }
            } else {
              obj[prop] = _encode(obj[prop]);
            }
          }
          return obj;
        },
        _decode = function(obj) {
          if (typeof obj !== 'object') {
            return obj;
          }
          for (var prop in obj) {
            if (!Array.isArray(obj)) {
              if (obj.hasOwnProperty(prop) && _keys[prop]) {
                obj[_keys[prop]] = _decode(obj[prop]);
                delete obj[prop];
              }
            } else {
              obj[prop] = _decode(obj[prop]);
            }
          }
          return obj;
        },
        compress = function(json) {
          _keys = [];
          var jsonObj = JSON.parse(json);
          _extractKeys(jsonObj);
          _lzwLoggingEnabled && _lzwLog('keys length : ' + _keys.length);
          _lzwLoggingEnabled && _lzwLog('keys        : ' + _keys);
          return JSON.stringify({ __k: _keys, __v: _encode(jsonObj) });
        },
        decompress = function(minifiedJson) {
          var obj = minifiedJson;
          if (typeof (obj) !== 'object') {
            return minifiedJson;
          }
          if (!obj.hasOwnProperty('__k')) {
            return JSON.stringify(obj);
          }
          _keys = obj.__k;
          return _decode(obj.__v);
        };

      self.KeyOptimize = {
        pack: compress,
        unpack: decompress
      };
    }(_self, Array, JSON));

    // LZWCompress
    // http://stackoverflow.com/a/2252533/218882
    // http://rosettacode.org/wiki/LZW_compression#JavaScript
    (function(self, Array) {
      var compress = function(uncompressed) {
        if (typeof (uncompressed) !== 'string') {
          return uncompressed;
        }
        var i,
          dictionary = {},
          c,
          wc,
          w = '',
          result = [],
          dictSize = 256;
        for (i = 0; i < 256; i += 1) {
          dictionary[String.fromCharCode(i)] = i;
        }
        for (i = 0; i < uncompressed.length; i += 1) {
          c = uncompressed.charAt(i);
          wc = w + c;
          if (dictionary[wc]) {
            w = wc;
          } else {
            if (dictionary[w] === undefined) {
              return uncompressed;
            }
            result.push(dictionary[w]);
            dictionary[wc] = dictSize++;
            w = String(c);
          }
        }
        if (w !== '') {
          result.push(dictionary[w]);
        }
        return result;
      },
        decompress = function(compressed) {
          if (!Array.isArray(compressed)) {
            return compressed;
          }
          var i,
            dictionary = [],
            w,
            result,
            k,
            entry = '',
            dictSize = 256;
          for (i = 0; i < 256; i += 1) {
            dictionary[i] = String.fromCharCode(i);
          }
          w = String.fromCharCode(compressed[0]);
          result = w;
          for (i = 1; i < compressed.length; i += 1) {
            k = compressed[i];
            if (dictionary[k]) {
              entry = dictionary[k];
            } else {
              if (k === dictSize) {
                entry = w + w.charAt(0);
              } else {
                return null;
              }
            }
            result += entry;
            dictionary[dictSize++] = w + entry.charAt(0);
            w = entry;
          }
          return result;
        };

      self.LZWCompress = {
        pack: compress,
        unpack: decompress
      };
    }(_self, Array));

    var _compress = function(obj) {
      _lzwLoggingEnabled && _lzwLog('original (uncompressed) : ' + obj);
      if (!obj || obj === true || obj instanceof Date) {
        return obj;
      }
      var result = obj;
      if (typeof obj === 'object') {
        result = _self.KeyOptimize.pack(JSON.stringify(obj));
        _lzwLoggingEnabled && _lzwLog('key optimized: ' + result);
      }
      var packedObj = _self.LZWCompress.pack(result);
      _lzwLoggingEnabled && _lzwLog('packed   (compressed)   : ' + packedObj);
      return packedObj;
    },
      _decompress = function(compressedObj) {
        _lzwLoggingEnabled && _lzwLog('original (compressed)   : ' + compressedObj);
        if (!compressedObj || compressedObj === true || compressedObj instanceof Date) {
          return compressedObj;
        }
        var probableJSON, result = _self.LZWCompress.unpack(compressedObj);
        try {
          probableJSON = JSON.parse(result);
        } catch (e) {
          _lzwLoggingEnabled && _lzwLog('unpacked (uncompressed) : ' + result);
          return result;
        }
        if (typeof probableJSON === 'object') {
          result = _self.KeyOptimize.unpack(probableJSON);
        }
        _lzwLoggingEnabled && _lzwLog('unpacked (uncompressed) : ' + result);
        return result;
      },
      _enableLogging = function(enable) {
        _lzwLoggingEnabled = enable;
      };

    return {
      pack: _compress,
      unpack: _decompress,
      enableLogging: _enableLogging
    };

  })(Array, JSON);

  return lzwCompress;
}).call(this);

var compress = s => JSON.stringify(lzw.pack(s));
compress = s => s;