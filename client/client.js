import env from "./game/env.js";
import World from "./game/World.js";
import Renderer from "./game/Renderer.js";

const $ = sel => document.querySelector(sel);
const $on = (sel, action, f) => $(sel).addEventListener(action, f, false);
const msg = m =>
  ($("#msgs").innerText = m + "\n" + $("#msgs").innerText.slice(0, 200));
const dgb = m => ($("#dbg").innerText = m);
const $id = id => ($("#client_id").innerText = id);
const $player_id = id => ($("#player_id").innerText = id);
const $world_id = id => ($("#world_id").innerText = id);

class ClientGame {
  constructor() {
    this.world = null;
    this.renderer = null;
    this.client_id = null;
    this.player_id = null;
    this.ws = null;

    this.pending_inputs = [];
    this.input_sequence_number = 0;

    this.entities = new Map();
    this.entity = null;

    this.xo = 0;
    this.yo = 0;

    $on("#btnLeft", "click", () => (this.yo = -3));
    $on("#btnRight", "click", () => (this.yo = +3));
    $on("#btnSend", "click", () =>
      this.send({ action: "CHAT", msg: $("#msg").value })
    );
    $("#host").value = env.base;
    $("#port").value = env.port;
    $("#btnJoin").onclick = () =>
      this.connect($("#host").value, $("#port").value);

    this.ticker = (() => {
      let ds = [];
      return () => {
        const dx = ds.slice(1).map((d, i) => d - ds[i]);
        ds = [...ds.slice(-30), Date.now()];
        return dx.reduce((ac, el) => ac + el, 0) / dx.length;
      };
    })();
  }

  connect(host, port) {
    if (this.client_id) {
      return;
    }
    const ws = new WebSocket(`ws://${host}:${port}`);
    ws.addEventListener("open", () => {}, false);
    ws.addEventListener("error", e => console.error(e), false);
    ws.addEventListener("close", () => msg("disconnected"), false);
    ws.addEventListener("message", e => this.receive(e), false);
    this.ws = ws;
  }

  newWorld(data) {
    const { pos, seed } = data;
    msg("Startin game." + JSON.stringify(data));
    this.start = Date.now();

    this.world = new World(seed);
    this.renderer = new Renderer();
    this.entities = new Map();

    // This creates all initial entities
    this.setEntities(pos);

    // Get local entity
    this.entity = this.entities.get(this.player_id);
    this.entity.__local = true;
  }

  receive(e) {
    const data = JSON.parse(e.data);
    const { action } = data;
    switch (action) {
      case "CONNECTED":
        this.client_id = data.id;
        msg("Connected. Client id " + this.client_id);
        $id(this.client_id);
        break;
      case "NEW_WORLD_INIT":
        if (this.tickTimer) {
          clearTimeout(this.tickTimer);
        }
        this.pending_inputs = [];
        this.input_sequence_number = 0;
        this.player_id = data.id;
        $player_id(this.player_id);
        $world_id(data.world);
        break;
      case "NEW_WORLD":
        this.newWorld(data);
        this.tick();
        break;
      case "TICK":
        this.lastTick = Date.now();
        this.setEntities(data.pos, data.dead);
        if (data.isDead) {
          msg("DEAD");
          this.world.isDead = true;
          this.deadTime = 100;
          this.renderer.render(this.world);
        }
        $world_id(data.lseq);
        $player_id(this.pending_inputs.length);

        // Apply pending inputs to player
        this.pending_inputs = this.pending_inputs.filter(i => {
          return i.seq > data.lseq;
        });
        this.pending_inputs.map(i => this.entity.update(i));
        break;
      default:
        msg(e.data);
    }
  }

  send(msg) {
    const { ws } = this;
    if (!ws || ws.readyState !== ws.OPEN) {
      return;
    }
    ws.send(JSON.stringify(msg));
  }

  setEntities(data, dead = []) {
    const { world, entities } = this;
    data.forEach(p => {
      const { id, x, y, bot } = p;
      let player = entities.get(id);
      if (!player) {
        player = world.addEntity(id);
        entities.set(id, player);
        player.__bot = bot;
      }
      player.pos.x = x;
      player.pos.y = y;
    });

    dead.forEach(id => {
      const e = entities.get(id);
      world.removeEntity(e);
      entities.delete(id);
    });
  }

  tick() {
    const { world, renderer } = this;
    if (!world) {
      return;
    }

    if (!world.isDead) {
      if (Math.random() < 0.5) {
        this.xo += (Math.random() * 2 - 1) * 0.5;
        this.yo += Math.random();
      }
      this.processInputs();
    }
    world.tick();
    renderer.render(world);

    if (world.isDead && --this.deadTime < 0) {
      this.world = null;
      return;
    }

    // TODO: Interpolate other entitites
    // ...

    // dgb((this.ticker()||0).toFixed(2));
    dgb(
      world.scene.length +
        ":" +
        this.entities.size +
        " __ " +
        this.entity.pos.x.toFixed(0) +
        ":" +
        this.entity.pos.y.toFixed(0) + " __ " + ((this.lastTick - this.start) / 1000).toFixed(0)
    );
    this.tickTimer = setTimeout(() => this.tick(), 1000 / 30);
  }

  processInputs() {
    const { xo, yo, player_id } = this;
    if (!(xo || yo)) {
      return;
    }

    const input = {
      action: "INPUT",
      xo,
      yo,
      seq: this.input_sequence_number++,
      entity_id: player_id
    };
    this.xo = 0;
    this.yo = 0;

    this.send(input);
    this.pending_inputs.push(input);
    this.entity.update(input);
  }
}

new ClientGame();
