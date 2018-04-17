class Renderer {
  constructor(w = 100, h = 100) {
    let c = document.querySelector("canvas");
    if (!c) {
      c = document.createElement("canvas");
      document.body.appendChild(c);
    }
    c.width = w;
    c.height = h;
    this.ctx = c.getContext("2d");
  }

  render(world, state) {
    const { ctx } = this;
    ctx.fillStyle = !state.isDead ? "#000" : "#300";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { boxes, scene, col } = world;
    ctx.fillStyle = `hsl(${col}, 50%, 30%)`;
    boxes.forEach(({ x, y }) => {
      ctx.fillRect(x, y, 8, 8);
    });

    scene.forEach(e => {
      if (e === state.entity && (Date.now() / 1000) % 0.2 < 0.1) {
        ctx.fillStyle = "#888";
        ctx.fillRect((e.pos.x | 0) - 1, (e.pos.y | 0) - 1, 5, 5);
      }
      ctx.fillStyle = e.color || "#f00"; //e === state.entity ?
      ctx.fillRect(e.pos.x | 0, e.pos.y | 0, 3, 3);
    });

    if (state.state) {
      ctx.fillStyle = "#fff";
      ctx.fillText(state.state, 20, 20);
    }
  }

  clear() {
    const { ctx } = this;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
}

export default Renderer;
