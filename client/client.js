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

    //this.pending_inputs = [];
    this.input_sequence_number = 0;

    this.entities = new Map();
    this.entity = null;

    this.xo = 0;
    this.yo = 0;

    $on("#btnLeft", "click", () => (this.xo = -1));
    $on("#btnRight", "click", () => (this.xo = +1));
    $on("#btnSend", "click", () =>
      this.send({ action: "CHAT", msg: $("#msg").value })
    );
    $("#host").value = env.base;
    $("#port").value = env.port;
    $("#btnJoin").onclick = () =>
      this.connect($("#host").value, $("#port").value);
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
        this.player_id = data.id;
        $player_id(this.player_id);
        $world_id(data.world);
        break;
      case "NEW_WORLD":
        this.newWorld(data);
        this.tick();
        break;
      case "TICK":
        this.setEntities(data.pos, data.dead);
        if (data.isDead) {
          msg("DEAD");
          this.world.isDead = true;
          this.world.deadTime = 1000;
        }
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

    // TODO: setting inputs should be part of the game code not the clientServer.
    if (Math.random() < 0.5) {
      this.xo += (Math.random() * 2 - 1) * 0.2;
      this.yo += (Math.random() * 2 - 1) * 0.2;
    }

    this.processInputs();
    world.tick();
    // Rendering should be handled by game?
    renderer.render(world);

    if (this.isDead && --this.deadTime < 0) {
      this.world = null;
    }

    dgb(world.scene.length + ":" + this.entities.size);
    setTimeout(() => this.tick(), 1000 / 30);
  }

  processInputs() {
    const { xo, yo, player_id } = this;
    if (!(xo || yo)) {
      return;
    }

    const input = { action: "INPUT", xo: xo * 8, yo: yo * 8 };
    this.xo = 0;
    this.yo = 0;

    input.input_sequence_number = this.input_sequence_number++;
    input.entity_id = player_id;
    this.send(input);
    this.entity.update(input); // client-side prediction
    //this.pending_inputs.push(input);
  }
}

new ClientGame();
