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

  render(world) {
    const { ctx } = this;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const { boxes, scene } = world;
    ctx.fillStyle = "#05f";
    boxes.forEach(({x, y}) => {
      ctx.fillRect(x, y, 10, 10);
    });

    scene.forEach(e => {
      ctx.fillStyle = e.__local ? "#e30" : e.__bot ? "#0f0" : "#ff0";
      ctx.fillRect(e.pos.x - 3, e.pos.z - 3, 6, 6);
    });
  }
}

export default Renderer;
