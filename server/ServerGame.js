import World from "../game/World.js";
import Bot from "./Bot.js";

class ServerGame {
  constructor(room, onClientLeft, onGameOver) {
    this.room = room;
    this.world = new World();
    this.entities = new Map();
    this.clientToEntity = new Map();
    this.lastInput = new Map();

    this.player_id = 1;
    this.bots = [];

    this.inputs = [];
    room.onMessage = this.onClientMessage.bind(this);
    room.onLeave = this.onClientLeave.bind(this);
    this.onClientLeft = onClientLeft;
    this.onGameOver = onGameOver;

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
        y: p.pos.y,
        bot: !!p.bot
      };
    });
  }

  addPlayer(client) {
    const { world, entities } = this;
    const id = this.player_id++;
    const p = world.addEntity(id);
    p.pos.x = (Math.random() * 100) | 0;
    p.pos.y = (Math.random() * 100) | 0;
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
      this.inputs.push({ id, xo: msg.xo, yo: msg.yo, seq: msg.seq, isBot });
    }
  }

  onClientLeave(client) {
    const { entities, clientToEntity } = this;
    const pId = clientToEntity.get(client.id);
    if (pId) {
      entities.delete(pId);
      clientToEntity.delete(client.Id);
    }
  }

  addBot(name) {
    const p = this.addPlayer();
    this.bots.push(new Bot(p, this.onClientMessage.bind(this)));
    //console.log("ADDED bot", p.id, "to", name);
  }

  tick() {
    const { world, room, entities, clientToEntity, bots, inputs } = this;

    inputs.forEach(({ id, xo, yo, isBot, seq }) => {
      const p = entities.get(id);
      if (p) {
        p.update({ xo, yo });
      } else {
        console.error("Entity dead (or unknown):", id);
      }
      if (!isBot) {
        this.lastInput.set(id, seq);
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
    });

    // TODO: bots should be ticked at client-speed not server-speed
    this.bots.forEach(b => {
      b.update();
    });

    const poss = this.getAllPos();

    room.clients.forEach(c => {
      const pid = clientToEntity.get(c.id);
      const isDead = dead.indexOf(pid) >= 0;
      c.send({
        action: "TICK",
        state: world.state,
        pos: poss,
        dead,
        isDead,
        lseq: this.lastInput.get(pid)
      });
      if (isDead) {
        this.onClientLeft(c);
      }
    });

    if (entities.size - this.bots.length > 0) {
      setTimeout(() => this.tick(), 1000 / 10);
    } else {
      this.onGameOver(this.room);
      console.log("WORLD OVER", this.room.name);
    }
  }
}

export default ServerGame;
