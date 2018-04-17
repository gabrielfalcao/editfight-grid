"use strict";

const WebSocket = require('uws');
const uuid = require('uuid/v4');
const fs = require('fs');

const config = {
  port: 4000,
  origin: process.env.NODE_ORIGIN,
  backups: process.env.SHOULD_BACKUP,
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














class AppState {

  constructor(filename) {
    this.filename = filename;
    this.dirty = false;
    this.messages = [];
    this.emptyColor = '0';
    this.canvas = this.emptyColor.repeat(100 * 100);
    this.recachePayload();
  }

  loadIfExists() {
    if (fs.existsSync(this.filename)) {
      const data = JSON.parse(fs.readFileSync(this.filename));
      this.messages = data.messages;
      this.canvas = data.canvas;
      this.dirty = false;
    }
    this.recachePayload();
  }

  recachePayload() {
    this.payload = JSON.stringify({
      messages: this.messages,
      canvas: this.canvas,
    });
  }

  pushMessage(text, hash) {
    this.messages.push({ text, hash });
    this.messages = this.messages.slice(-5000);
    this.dirty = true;
    this.recachePayload();
    return this.messages[this.messages.length - 1];
  }

  savePeriodically() {
    setInterval(this.save.bind(this), 5000);
  }

  save() {
    if (!this.dirty) return;
    this.dirty = false;
    console.log(`Saving to "${this.filename}"...`);
    fs.writeFileSync(this.filename, this.payload);
  }

  backup() {
    const filename = `./data-backup-${Math.floor(new Date() / 1000)}.json`;
    fs.writeFileSync(filename, this.payload);
    console.log(`Backing up to "${this.filename}"`);
  }

  backupPeriodically() {
    this.backup();
    setInterval(this.backup.bind(this), 1000 * 60 * 60); // every hour
  }

  clearGrid() {
    this.canvas = this.emptyColor.repeat(100 * 100);
    this.recachePayload();
    return this.canvas;
  }

  updatePixel(x, y, c) {
    this.dirty = true;
    const i = y * 100 + x;
    this.canvas = replaceAt(this.canvas, i, c.toString(16));
    this.recachePayload();
  }

}







class Clearer {

  constructor(server) {
    this.ips = {};
    this.server = server;
  }

  validClearCommand(text) {
    return text.toLowerCase().match(/^(\[\w+\] )?clear$/);
  }

  canClear() {
    return Object.keys(this.ips).length >= this.server.count * 0.50;
  }

  voteAndMaybeClear(text, ip) {
    if (!this.validClearCommand(text))
      return false;

    this.ips[ip] = true;

    const clearing = this.canClear();
    if (clearing) this.ips = {};

    return clearing;
  }

}


class Throttler {

  constructor() {
    this.ips = {};
  }

  throttle(ip) {
    if (this.ips[ip])
      return true;

    this.ips[ip] = true;
    setTimeout(() => {
      delete this.ips[ip];
    }, 20);

    return false;
  }

}








const server = new Server({
  port: config.port,
  origin: config.origin,
  pruneInterval: config.pruneInterval,
});

const clearer = new Clearer(server);
const appState = new AppState('./data');
const throttler = new Throttler();

appState.loadIfExists();
appState.savePeriodically();

if (config.backups) {
  appState.backupPeriodically();
}





server.onopen = (ws) => {
  ws.hash = hashForString(ws.ip);
  server.send(ws, appState.payload);
  server.sendToAll({ count: server.count });
};

server.onclose = (ws) => {
  server.sendToAll({ count: server.count });
};

server.commands = {

  paint(ws, update) {
    if (throttler.throttle()) return;

    const { x, y, c } = update;
    update.hash = ws.hash;

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

    appState.updatePixel(x, y, c);
    server.sendToAll({ pixel: update });
  },

  text(ws, text) {
    text = text.trim();

    if (text.length === 0) return;
    if (text.length > config.charLimit) return;

    const message = appState.pushMessage(text, ws.hash);
    const payload = { message }

    if (clearer.voteAndMaybeClear(text, ws.ip)) {
      payload.canvas = appState.clearGrid();
    }

    server.sendToAll(payload);
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