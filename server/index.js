import Server from "../lobby/Server.js";
import env from "../game/env.js";
import World from "../game/World.js";
import Player from "../game/Player.js";

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

class ServerGame {
  constructor(room) {
    this.room = room;
    this.game = new World();
    this.entities = new Map();

    room.onMessage = this.onMessage.bind(this);

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
    const p = game.addEntity(id);
    p.pos.x = (Math.random() * 100) | 0;
    p.pos.z = (Math.random() * 100) | 0;
    entities.set(id, p);
    return p;
  }
  onMessage(id, msg) {
    const { room, entities } = this;
    if (msg.action === "CHAT") {
      room.broadcast(id, msg.msg);
      return;
    }
    const c = room.clients.get(id);
    if (c) {
      const p = entities.get(id);
      if (p) {
        p.pos.x += msg.xo;
      } else {
        console.error("no player", id);
      }
    } else {
      console.error("who is this?", id);
    }
  }
  tick() {
    const { game, room, entities } = this;

    if (Math.random() < 0.01) {
      this.addPlayer((Math.random() * 1000) | 0);
    }

    // Fake inputs
    entities.forEach(p => {
      p.xo = Math.random() * 4 - 2;
      p.zo = Math.random() * 4 - 2;

      p.pos.x += p.xo;
      p.pos.z += p.zo;
    });

    const dead = game.tick();
    dead.forEach(d => entities.delete(d));
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

/*
class Input {
  constructor() {
    this.xo = 0;
    this.zo = 0;
    this.jump = false;
    this.sequenceNumber = 0;
  }
}

class NetworkClient {
  constructor(entity) {
    this.entity = entity;
    this.entities = {};
    this.pending_input = [];
  }
  update() {
    this.processServerMessages();
    this.processInputs();
    this.interpolateEntities();
  }
  processServerMessages() {}
  processInputs() {
    const { entity } = this;
    entity.update({
      x: 0.1,
      z: 0.1
    });
  }
  interpolateEntities() {}
}
*/
