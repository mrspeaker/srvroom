import World from "../game/World.js";
import Bot from "./Bot.js";

class ServerGame {
  constructor(room, onClientLeft, onGameOver) {
    this.room = room; // Net
    this.world = new World(); // Game

    // Should this be a proxy instead of actual entity?
    // like, a proxy of only network-enabled properties
    // atm it's a mix of Net AND Game
    this.entities = new Map(); // id -> gameEntity
    this.botEntities = new Map(); // id -> bot gameentity
    this.entityId = 0;

    this.clientToEntity = new Map(); // clientId -> id // Net
    this.clientLastSeqNum = new Map(); // id -> seqNumm // Net
    this.pendingInputs = []; // Array<Inputs> // Game and Net

    room.onMessage = this.onClientMessage.bind(this);
    room.onLeave = this.onClientLeave.bind(this);
    this.onClientLeft = onClientLeft;
    this.onGameOver = onGameOver;

    [...room.clients.values()].forEach(c => this.addClient(c));

    this.tick();
  }

  addEntity() {
    const { world, entities } = this;
    const id = ++this.entityId;
    const p = world.addEntity(id);
    p.pos.x = (Math.random() * 100) | 0;
    p.pos.y = (Math.random() * 100) | 0;
    entities.set(id, p);
    return p;
  }

  addClient(client) {
    const { room, world, clientToEntity } = this;
    const p = this.addEntity(client);
    clientToEntity.set(client.id, p.id);
    client.send({
      action: "NEW_WORLD",
      id: p.id,
      world: room.name,
      seed: world.seed,
      x: p.pos.x,
      y: p.pos.y
    });
  }

  addBot(name) {
    const { botEntities } = this;
    const b = new Bot(this.addEntity(), this.onClientMessage.bind(this));
    botEntities.set(b.id, b);
    console.log("ADDED bot", b.id, "to", name);
  }

  getAllPos() {
    const { entities } = this;
    return Array.from(entities, ([, p]) => {
      return {
        id: p.id,
        x: p.pos.x,
        y: p.pos.y,
        angle: p.angle,
        bot: !!p.bot
      };
    });
  }

  onClientMessage(client_id, msg, isBot = false) {
    const { room, clientToEntity } = this;
    const id = isBot ? client_id : clientToEntity.get(client_id);
    if (msg.action === "CHAT") {
      room.broadcast({ fromId: id, msg: msg.msg });
      return;
    }
    if (msg.action === "INPUT") {
      this.pendingInputs.push({
        id,
        xo: msg.xo,
        yo: msg.yo,
        seq: msg.seq,
        isBot
      });
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

  tick() {
    const {
      world,
      room,
      entities,
      clientToEntity,
      clientLastSeqNum,
      botEntities,
      pendingInputs
    } = this;

    // TODO: figure out what is Game and what is Net.

    pendingInputs.forEach(({ id, xo, yo, isBot, seq }) => {
      const p = entities.get(id);
      if (p) {
        p.update({ xo, yo });
      } else {
        console.error("Entity dead (or unknown):", id);
      }
      if (!isBot) {
        this.clientLastSeqNum.set(id, seq);
      }
    });
    this.pendingInputs = [];

    if (Math.random() < 0.01) {
      this.addBot(room.name);
    }

    const dead = world.tick();
    dead.forEach(d => {
      // TODO: better sepeartion of clients and bots - here just deleteing from both!
      entities.delete(d);
      botEntities.delete(d);
    });

    // TODO: bots should be ticked at client-speed not server-speed
    botEntities.forEach(b => {
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
        lseq: clientLastSeqNum.get(pid)
      });
      if (isDead) {
        this.onClientLeft(c);
      }
    });

    if (entities.size - botEntities.size > 0) {
      setTimeout(() => this.tick(), 1000 / 10);
    } else {
      this.onGameOver(this.room);
      console.log("WORLD OVER", this.room.name);
    }
  }
}

export default ServerGame;
