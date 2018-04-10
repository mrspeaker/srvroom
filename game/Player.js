class Player {
  constructor(id, world) {
    this.id = id;
    this.pos = {
      x: 0,
      y: 0
    };
    this.w = 6;
    this.h = 6;
    this.world = world;
  }

  update(input) {
    const { pos, w, h, world } = this;
    const { boxes } = world;
    let { xo, yo } = input;
    const noHit = boxes.every(b => {
      if (
        pos.x + xo + w >= b.x &&
        pos.x + xo <= b.x + 10 &&
        pos.y + yo + h >= b.y &&
        pos.y + yo <= b.y + 10
      ) {
        return false;
      }
      return true;
    });
    if (noHit) {
      pos.x += xo;
      pos.y += yo;
    } else {
      // NOPE: wll be different local / server.
      pos.x = Math.random() * 80 + 10;
      pos.y = Math.random() * 80 + 10;
    }
  }
}

export default Player;
