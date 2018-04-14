import World from "../game/World.js";
import Bot from "./Bot.js";

class ServerGame {
  constructor(room, onClientLeft, onGameOver) {
    this.room = room;

    this.world = new World();
    // Should this be a proxy instead of actual entity?
    // like, a proxy of only network-enabled properties
    this.entities = new Map(); // id -> gameEntity
    this.bots = new Map(); // id -> gameentity

    this.clientToEntity = new Map(); // clientId -> id
    this.entityLastSeqNum = new Map(); // id -> seqNumm
    this.pending_inputs = []; // Array<Inputs>

    this.entity_id = 0;

    room.onMessage = this.onClientMessage.bind(this);
    room.onLeave = this.onClientLeave.bind(this);
    this.onClientLeft = onClientLeft;
    this.onGameOver = onGameOver;

    [...room.clients.values()].forEach(c => this.addClient(c));

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

  addClient(client) {
    const { room, world } = this;
    const p = this.addPlayer(client);
    client.send({
      action: "NEW_WORLD",
      id: p.id,
      world: room.name,
      seed: world.seed,
      x: p.pos.x,
      y: p.pos.y
    });
  }

  addPlayer(client) {
    const { world, entities } = this;
    const id = ++this.entity_id;
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
      this.pending_inputs.push({ id, xo: msg.xo, yo: msg.yo, seq: msg.seq, isBot });
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
    const b = new Bot(p, this.onClientMessage.bind(this));
    this.bots.set(b.id, b);
    console.log("ADDED bot", p.id, "to", name);
  }

  tick() {
    const { world, room, entities, clientToEntity, bots, pending_inputs } = this;

    pending_inputs.forEach(({ id, xo, yo, isBot, seq }) => {
      const p = entities.get(id);
      if (p) {
        p.update({ xo, yo });
      } else {
        console.error("Entity dead (or unknown):", id);
      }
      if (!isBot) {
        this.entityLastSeqNum.set(id, seq);
      }
    });
    this.pending_inputs = [];

    if (Math.random() < 0.01) {
      this.addBot(room.name);
    }

    const dead = world.tick();
    dead.forEach(d => {
      // TODO: better sepeartion of clients and bots
      entities.delete(d);
      // Remove dead bots
      bots.delete(d);
    });

    // TODO: bots should be ticked at client-speed not server-speed
    bots.forEach(b => {
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
        lseq: this.entityLastSeqNum.get(pid)
      });
      if (isDead) {
        this.onClientLeft(c);
      }
    });

    if (entities.size - bots.size > 0) {
      setTimeout(() => this.tick(), 1000 / 10);
    } else {
      this.onGameOver(this.room);
      console.log("WORLD OVER", this.room.name);
    }
  }
}

export default ServerGame;
