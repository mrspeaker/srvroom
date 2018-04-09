import Server from "../lobby/Server.js";
import env from "../game/env.js";
import World from "../game/World.js";

const s = new Server(env.port);
const rooms = s.rooms;
const games = new Map();
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
    games.set(room.name, new ServerGame(room));
  }
};

class Bot {
  constructor(player, send) {
    this.player = player;
    this.send = send;
    player.bot = true;
  }
  update() {
    const xo = (Math.random() * 2 - 1) * 0.2;
    const zo = (Math.random() * 2 - 1) * 0.2;
    const input = { action: "INPUT", xo: xo * 8, zo: zo * 8 };
    this.send(this.player.id, input, true);
  }
}

class ServerGame {
  constructor(room) {
    this.room = room;
    this.world = new World((Math.random() * 10000) | 0);
    this.entities = new Map();
    this.clientToEntity = new Map();
    this.player_id = 1;
    room.onMessage = this.onClientMessage.bind(this);
    this.bots = [];
    this.inputs = [];

    [...room.clients.values()].forEach(c => {
      const p = this.addPlayer(c);
      c.send({ action: "NEW_WORLD_INIT", id: p.id, world: room.name });
    });

    room.broadcast({
      action: "NEW_WORLD",
      pos: this.getAllPos(),
      seed: this.world.seed
    });

    this.tick();
  }

  getAllPos() {
    const { entities } = this;
    return Array.from(entities, ([, p]) => {
      return {
        id: p.id,
        x: p.pos.x,
        z: p.pos.z,
        bot: !!p.bot
      };
    });
  }

  addPlayer(client) {
    const { world, entities } = this;
    const id = this.player_id++;
    const p = world.addEntity(id);
    p.pos.x = (Math.random() * 100) | 0;
    p.pos.z = (Math.random() * 100) | 0;
    entities.set(id, p);
    if (client) {
      this.clientToEntity.set(client.id, p.id);
    }
    return p;
  }

  onClientMessage(client_id, msg, isBot = false) {
    const { room, clientToEntity } = this;
    const id = isBot ? client_id : clientToEntity.get(client_id);
    if (msg.action === "CHAT") {
      room.broadcast({ fromId: id, msg: msg.msg });
      return;
    }
    if (msg.action === "INPUT") {
      this.inputs.push({ id, xo: msg.xo, zo: msg.zo });
    }
  }

  addBot(name) {
    const p = this.addPlayer();
    this.bots.push(new Bot(p, this.onClientMessage.bind(this)));
    console.log("ADDED bot", p.id, "to", name);
  }

  tick() {
    const { world, room, entities, clientToEntity, bots, inputs } = this;

    inputs.forEach(({ id, xo, zo }) => {
      const p = entities.get(id);
      if (p) {
        p.pos.x += xo;
        p.pos.z += zo;
      } else {
        console.error("Entity dead (or unknown):", id);
      }
    });
    this.inputs = [];

    if (Math.random() < 0.01) {
      this.addBot(room.name);
    }

    const dead = world.tick();
    dead.forEach(d => {
      entities.delete(d);
      // Remove dead bots
      this.bots = bots.filter(b => b.player.id !== d);
      console.log("DEAD", d);
    });

    // TODO: bots should be ticked at client-speed not server-speed
    this.bots.forEach(b => {
      b.update();
    });


    const poss = this.getAllPos();

    room.clients.forEach(c => {
      const isDead = dead.indexOf(clientToEntity.get(c.id)) >= 0;
      c.send({ action: "TICK", state: world.state, pos: poss, dead, isDead });
      if (isDead) {
        rooms.addToLobby(c);
      }
    });

    if (entities.size - this.bots.length > 0) {
      setTimeout(() => this.tick(), 1000 / 10);
    } else {
      games.delete(this.room.name);
      console.log("WORLD OVER", this.room.name, games.size);
    }
  }
}
