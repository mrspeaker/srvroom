class Renderer {
  constructor () {
    const c = document.querySelector("canvas") || document.createElement("canvas");
    this.ctx = c.getContext("2d");
    document.body.appendChild(c);
  }

  render(scene) {
    const { ctx } = this;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    scene.forEach(e => {
      ctx.fillStyle = e.local ? "#830" : "#ff0";
      ctx.fillRect(e.pos.x - 5, e.pos.z - 5, 10, 10);
    });
  }
}

export default Renderer;
