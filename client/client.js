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
    this.ws = null;

    this.pending_inputs = [];
    this.input_sequence_number = 0;

    this.entities = new Map();

    this.lastX = 0;
    this.lastY = 0;
    this.input = {
      xo: 0,
      yo: 0.15
    };

    this.state = {
      isDead: false,
      entity: null,
      state: "INIT"
    };

    $on("#btnLeft", "click", () => (this.input.yo = -1));
    $on("#btnRight", "click", () => (this.input.yo = +1));
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
    const { seed } = data;
    msg("Startin game. " + data.action + " " +  data.world + " : " + data.seed);
    this.start = Date.now();

    this.world = new World(seed);
    this.renderer = new Renderer();
    this.entities = new Map();

    this.pending_inputs = [];
    this.input_sequence_number = 0;
    this.setEntities([{ id: data.id, x: data.x, y: data.y, bot: false }]);
    const entity = this.entities.get(data.id);
    this.state = {
      isDead: false,
      entity,
      state: "INIT"
    };
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
      case "JOINED_ROOM":
        $world_id(data.data);
        break;

      case "NEW_WORLD":
        if (this.tickTimer) {
          clearTimeout(this.tickTimer);
        }
        this.newWorld(data);
        $player_id(data.id);
        $world_id(data.world);
        this.tick();
        break;

      case "TICK":
        this.onReceiveTick(data);
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

  onReceiveTick(data) {
    const { state, world } = this;
    switch (data.state) {
      case "READY":
        state.state = "READY " + data.time;
        break;
      case "PLAY":
        this.lastTick = Date.now();
        state.state = "";
        this.setEntities(data.pos, data.dead);
        $player_id(this.pending_inputs.length);
        if (data.isDead) {
          state.state = "DEAD";
          state.isDead = true;
        }

        // Apply pending inputs to player
        this.pending_inputs = this.pending_inputs.filter(i => {
          if (i.seq > data.lseq) {
            return true;
          }
          state.entity.update(i);
          return false;
        });

        if(data.deadBricks) {
          world.boxes = world.boxes.filter(b => !data.deadBricks.includes(b.id));
        }
        break;
      case "GAMEOVER":
        state.state = "GAMEOVER" + data.time;
        break;

      case "WORLDOVER":
        this.world = null;
        this.renderer.clear();
        break;
    }
  }

  setEntities(data, dead = []) {
    const { world, entities } = this;
    data.forEach(p => {
      const { id, x, y, angle, bot, col } = p;
      let entity = entities.get(id);
      if (!entity) {
        // new entity
        entity = world.addEntity(id);
        entities.set(id, entity);
        // Hmmm, no... pos_buffer is injected on entity.
        entity.pos.x = x;
        entity.pos.y = y;
        entity.color = col;
        entity.position_buffer = [];
      } else if (entity === this.state.entity) {
        // Local entity, just set it.
        this.lastX = x;
        this.lastY = y;
        entity.pos.x = x;
        entity.pos.y = y;
        entity.color = col;
      } else {
        // Add it to the position buffer for interpolation
        entity.position_buffer.push([Date.now(), { x, y }]);
      }
      entity.angle = angle;
    });

    dead.forEach(id => {
      const e = entities.get(id);
      world.removeEntity(e);
      entities.delete(id);
    });
  }

  tick() {
    const { world, renderer, state, input } = this;
    if (!world) {
      return;
    }

    if (!state.isDead) {
      if (Math.random() < 0.03) {
        input.xo = 0;
      }
      input.xo += (Math.random() * 2 - 1) * 0.01;

      this.processInputs();
    }
    this.interpolateEntities();

    world.tick();
    renderer.render(world, state);

    dgb(
      world.scene.length +
        ":" +
        this.entities.size +
        " __ " +
        this.lastX.toFixed(0) +
        ":" +
        this.lastY.toFixed(0) +
        " __ " +
        ((this.lastTick - this.start) / 1000).toFixed(0)
    );
    this.tickTimer = setTimeout(() => this.tick(), 1000 / 30);
  }

  processInputs() {
    const { input, state } = this;
    const { xo, yo } = input;
    if (!(xo || yo)) {
      return;
    }
    const i = {
      action: "INPUT",
      xo,
      yo,
      seq: this.input_sequence_number++,
      entity_id: state.entity.id
    };

    this.pending_inputs.push(i);
    this.send(i);
    state.entity.update(i);
  }

  interpolateEntities() {
    const { entities, state } = this;
    const now = Date.now();
    const render_timestamp = now - 1000.0 / 10.0; //server.update_rate;
    entities.forEach(entity => {
      if (entity === state.entity) {
        return;
      }
      // Find the two authoritative positions surrounding the rendering timestamp.
      const buffer = entity.position_buffer;
      // Drop older positions.
      while (buffer.length >= 2 && buffer[1][0] <= render_timestamp) {
        buffer.shift();
      }

      // Interpolate between the two surrounding authoritative positions.
      if (
        buffer.length >= 2 &&
        buffer[0][0] <= render_timestamp &&
        render_timestamp <= buffer[1][0]
      ) {
        var pos0 = buffer[0][1];
        var pos1 = buffer[1][1];
        var t0 = buffer[0][0];
        var t1 = buffer[1][0];

        // lerp
        entity.pos.x =
          pos0.x + (pos1.x - pos0.x) * (render_timestamp - t0) / (t1 - t0);
        entity.pos.y =
          pos0.y + (pos1.y - pos0.y) * (render_timestamp - t0) / (t1 - t0);
      }
    });
  }
}

new ClientGame();
