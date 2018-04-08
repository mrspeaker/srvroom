import Server from "../lobby/Server.js";
import env from "../game/env.js";
import World from "../game/World.js";

const s = new Server(env.port);
const rooms = s.rooms;
const games = [];
let world_id = 0;

s.onClientConnect = client => {
  client.ws.send(
    JSON.stringify({
      action: "CONNECTED",
      id: client.id,
      lobbyCount: rooms.lobby.count
    })
  );
};

rooms.onEnterLobby = () => {
  if (rooms.lobby.count == 2) {
    const room = rooms.add("world" + ++world_id);
    rooms.lobby.clients.forEach(c => room.join(c));
    games.push(new ServerGame(room));
  }
};

class Bot {
  constructor (player, send) {
    this.player = player;
    this.send = send;
  }
  update() {
    const xo = (Math.random() * 2 - 1) * 0.2;
    const zo = (Math.random() * 2 - 1) * 0.2;
    const input = { action: "INPUT", xo: xo * 8, zo: zo * 8 };
    this.send(this.player.id, input);
  }
}

class ServerGame {
  constructor(room) {
    this.room = room;
    this.game = new World();
    this.entities = new Map();
    this.bots = [];
    room.onMessage = this.onClientMessage.bind(this);

    [...room.clients.values()].forEach(c => this.addPlayer(c.id));

    const poss = this.getAllPos();
    this.entities.forEach(p => {
      room.clients.get(p.id).send({ action: "NEW_GAME", pos: poss });
    });

    this.tick();
  }
  getAllPos() {
    const { entities } = this;
    return Array.from(entities, ([, p]) => {
      return { id: p.id, x: p.pos.x, z: p.pos.z };
    });
  }

  addPlayer(id) {
    const { game, entities } = this;
    // TODO: don't use client_id - have a map of client->player
    const p = game.addEntity(id);
    p.pos.x = (Math.random() * 100) | 0;
    p.pos.z = (Math.random() * 100) | 0;
    entities.set(id, p);
    return p;
  }

  onClientMessage(id, msg) {
    const { room, entities } = this;
    if (msg.action === "CHAT") {
      room.broadcast(id, msg.msg);
      return;
    }
    if (msg.action === "INPUT") {
      const p = entities.get(id);
      if (p) {
        // TODO: add input to list-to-process
        p.pos.x += msg.xo;
        p.pos.z += msg.zo;
      } else {
        console.error("who is this?", id);
      }
    }
  }

  addBot () {
    const p = this.addPlayer((Math.random() * 1000) | 0);
    this.bots.push(new Bot(p, this.onClientMessage.bind(this)));
  }

  tick() {
    const { game, room, entities, bots } = this;

    if (Math.random() < 0.01) {
      this.addBot();
    }

    // TODO: bots should be ticked at client-speed not server-speed
    bots.forEach(b => {
      b.update();
    });

    const dead = game.tick();
    dead.forEach(d => {
      entities.delete(d);
      // Remove dead bots
      this.bots = this.bots.filter(b => b.player.id !== d);
    });
    
    const poss = this.getAllPos();

    room.clients.forEach(c => {
      const isDead = dead.indexOf(c.id) >= 0;
      c.send({ action: "TICK", state: game.state, pos: poss, dead, isDead });
      if (isDead) {
        rooms.addToLobby(c);
      }
    });

    setTimeout(() => this.tick(), 1000 / 10);
  }
}
