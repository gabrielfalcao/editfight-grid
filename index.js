"use strict";

const WebSocket = require('uws');
const uuid = require('uuid/v4');
const fs = require('fs');
const md5 = require('md5');

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
    this.count = 0;
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

    ws.ip = ip;
    ws.isAlive = true;

    this.ips[ws.ip] = (this.ips[ws.ip] || 0) + 1;
    this.count = Object.keys(this.ips).length;

    this.onopen(ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', (code, reason) => {
      this.ips[ws.ip] -= 1;
      if (!this.ips[ws.ip]) delete this.ips[ws.ip];
      this.count = Object.keys(this.ips).length;

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

    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    })
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
    this.messages = this.messages.slice(-5000);
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
    this.canvas = '0'.repeat(100 * 100);
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
        const c = parseInt(hex, 16);
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
    this.canvas = replaceAt(this.canvas, i, c.toString(16));
    this.dirty = true;
  }

}









class TimeLapse {

  constructor(filename) {
    this.buffer = Buffer.allocUnsafe(11);
    this.file = fs.createWriteStream(filename, { flags: 'a' });
  }

  add(x, y, c) {
    const t = new Date().getTime();

    this.buffer.writeUInt8(x, 0);
    this.buffer.writeUInt8(y, 1);
    this.buffer.writeUInt8(c, 2);
    this.buffer.writeDoubleLE(t, 3);

    this.file.write(this.buffer);
  }

}










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

function setPixel(x, y, c, hash) {
  timeLapse.add(x, y, c);
  grid.updatePixel(x, y, c);
  batch.push({ x, y, c, hash });
}

function clearGrid() {
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      setPixel(x, y, 0, 0);
    }
  }
}

let clearVotes = {};

function sendMessage(message) {
  chat.pushMessage(message);
  server.sendToAll({ message });
}

const waiting = {};
function throttle(ip) {
  if (waiting[ip]) return true;
  waiting[ip] = true;
  setTimeout(() => {
    delete waiting[ip];
  }, 250);
  return false;
}

server.commands = {

  [config.cheatcode]: function(ws) {
    ws.flags = { admin: true };
  },

  paint(ws, update) {
    if (throttle(ws.ip)) return;

    const { x, y, c } = update;

    if (
      typeof (x) !== 'number' ||
      typeof (y) !== 'number' ||
      typeof (c) !== 'number' ||
      x < 0 || x > 99 ||
      y < 0 || y > 99 ||
      c < 0 || c > 15
    ) {
      return;
    }

    setPixel(x, y, c, ws.hash);
  },

  text(ws, text) {
    text = text.trim();

    if (text.length === 0) return;
    if (text.length > config.charLimit) return;

    sendMessage({ text, hash: ws.hash, ...ws.flags });

    const clearVote = text.match(/^(\[\w+\]\s+)?\/clear\s*$/i);
    if (clearVote) {
      clearVotes[ws.ip] = true;
      const votes = Object.keys(clearVotes).length;
      const need = Math.ceil(server.count * 0.50);

      if (votes >= need) {
        clearVotes = {};
        sendMessage({ text: `Clear-vote cast. Got ${votes} votes. Needed ${need} to clear. Clearing!`, hash: 0 });
        clearGrid();
      }
      else {
        sendMessage({ text: `Clear-vote cast. Currently at ${votes} votes. Need ${need} to clear.`, hash: 0 });
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