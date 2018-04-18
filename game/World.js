import Player from "./Player.js";
import { rand, randSeed } from "./utils.js";

class World {
  constructor(seed = randSeed()) {
    this.seed = seed;
    this.rand = rand(seed);

    this.scene = [];
    this.col = (this.rand() * 360) | 0;
    this.boxes = [...Array(4)].map(() => ({
      x: this.rand() * 100,
      y: this.rand() * 100,
      w: 8,
      h: 8
    }));
    this.isDead = false;
  }

  addEntity(id) {
    const e = new Player(id, this);
    this.scene.push(e);
    return e;
  }

  removeBox(i) {
    this.boxes.splice(i, 1);
  }

  removeEntity(e) {
    this.scene = this.scene.filter(ent => e !== ent);
  }

  tick() {
    const dead = [];
    this.scene = this.scene.filter(p => {
      if (p.pos.x < 0 || p.pos.x > 100 || p.pos.y < 0 || p.pos.y > 100) {
        dead.push(p.id);
        return false;
      }
      return true;
    });
    return dead;
  }
}
export default World;
