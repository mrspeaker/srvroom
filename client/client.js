import env from "./game/env.js";
import World from "./game/World.js";
import Renderer from "./game/Renderer.js";

const $ = sel => document.querySelector(sel);
const $on = (sel, action, f) => $(sel).addEventListener(action, f, false);
const msg = m =>
  ($("#msgs").innerText = m + "\n" + $("#msgs").innerText.slice(0, 200));
const dgb = m => ($("#dbg").innerText = m);
const $id = id => $("#client_id").innerText = id;

class ClientGame {
  constructor() {
    this.world = null;
    this.renderer = null;
    this.client_id = null;
    this.ws = null;

    this.pending_inputs = [];
    this.input_sequence_number = 0;

    this.entities = new Map();
    this.entity = null;

    this.xo = 0;

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

  newGame(data) {
    msg("Startin game." + data.pos.map(p => p.id).join(","));
    this.world = new World();
    this.renderer = new Renderer();
    this.entities = new Map();
    this.setPos(data.pos);
    this.entity = this.entities.get(this.client_id);
    this.entity.local = true;
    this.tick();
  }

  receive(e) {
    const data = JSON.parse(e.data);
    const { action } = data;
    switch (action) {
      case "CONNECTED":
        this.client_id = data.id;
        msg("Joined as " + this.client_id);
        $id(this.client_id);
        break;
      case "NEW_GAME":
        this.newGame(data);
        break;
      case "TICK":
        this.setPos(data.pos, data.dead);
        if (data.isDead) {
          msg("DEAD");
          this.world = null;
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

  setPos(pos, dead = []) {
    const { world, entities } = this;
    pos.forEach(p => {
      let pl = entities.get(p.id);
      if (!pl) {
        pl = world.addEntity(p.id);
        entities.set(p.id, pl);
      }
      pl.pos.x = p.x;
      pl.pos.z = p.z;
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
    this.processInputs();
    world.tick();
    renderer.render(world.scene);
    dgb(world.scene.length + ":" + this.entities.size);
    setTimeout(() => this.tick(), 1000 / 30);
  }

  processInputs() {
    const { xo, client_id } = this;
    const input = { action: "INPUT", xo: xo * 8 };

    if (!xo) {
      return;
    }
    this.xo = 0;

    input.input_sequence_number = this.input_sequence_number++;
    input.entity_id = client_id;
    this.send(input);
    this.entity.update(input); // client-side prediction
    //this.pending_inputs.push(input);
  }
}

new ClientGame();
