import env from "./game/env.js";
import World from "./game/World.js";
import Player from "./game/Player.js";
import Renderer from "./game/Renderer.js";

const $ = sel => document.querySelector(sel);
const $on = (sel, action, f) => $(sel).addEventListener(action, f, false);
const msg = m =>
  ($("#msgs").innerText = m + "\n" + $("#msgs").innerText.slice(0, 200));

class ClientGame {
  constructor() {
    this.world = null;
    this.renderer = null;
    this.client_id = null;
    this.ws = null;
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
    const ws = new WebSocket(`ws://${host}:${port}`);
    ws.addEventListener("open", () => {}, false);
    ws.addEventListener("error", e => console.error(e), false);
    ws.addEventListener("close", () => msg("disconnected"), false);
    ws.addEventListener("message", e => this.receive(e), false);
    this.ws = ws;
  }

  newGame(data) {
    msg("startin game." + JSON.stringify(data.pos));
    this.world = new World();
    this.renderer = new Renderer();
    this.setPos(data.pos);
    this.tick();
  }

  receive(e) {
    const data = JSON.parse(e.data);
    if (data.action === "CONNECTED") {
      this.client_id = data.id;
      msg("Joined as " + this.client_id);
    } else if (data.action === "NEW_GAME") {
      this.newGame(data);
    } else if (data.action === "TICK") {
      this.setPos(data.pos);
      if (data.isDead) {
        msg("DEAD");
        this.world = null;
      }
    } else msg(e.data);
  }

  send(msg) {
    const { ws } = this;
    if (!ws || ws.readyState !== ws.OPEN) {
      return;
    }
    ws.send(JSON.stringify(msg));
  }

  setPos(pos) {
    const { world, client_id } = this;
    pos.forEach(p => {
      let pl = world.scene.find(e => e.id == p.id);
      if (!pl) {
        pl = new Player(p.id);
        world.addPlayer(pl);
      }
      pl.pos.x = p.x;
      pl.pos.z = p.z;
      if (p.id === client_id) {
        pl.local = true;
      }
    });
  }

  tick() {
    const { world, renderer, xo } = this;
    if (!world) {
      return;
    }
    if (xo) {
      this.send({ action: "INPUT", xo: xo * 8 });
      this.xo = 0;
    }
    world.tick();
    renderer.render(world.scene);
    setTimeout(() => this.tick(), 1000 / 30);
  }
}

new ClientGame();
