class Player {
  constructor(id, world, color = "yellow") {
    this.id = id;
    this.pos = {
      x: 0,
      y: 0
    };
    this.w = 3;
    this.h = 3;
    this.world = world;
    this.angle = 0;
    this.speed = 2;
    this.color = color;
  }

  update(input) {
    const { pos, w, h, world, angle, speed } = this;
    const { boxes } = world;
    let { xo, yo } = input;

    const xx = Math.cos(angle) * speed * yo;
    const yy = Math.sin(angle) * speed * yo;

    this.angle += xo;

    let boxHit = null;
    const noHit = boxes.every(b => {
      if (
        pos.x + xx + w >= b.x &&
        pos.x + xx <= b.x + b.w &&
        pos.y + yy + h >= b.y &&
        pos.y + yy <= b.y + b.h
      ) {
        boxHit = b.id;
        return false;
      }
      return true;
    });
    if (noHit) {
      pos.x += xx;
      pos.y += yy;
    } else {
      // NOPE: wll be different local / server.
      pos.x += Math.random() * 2 - 1;
      pos.y += Math.random() * 2 - 1;
    }
    return boxHit;
  }
}

export default Player;
