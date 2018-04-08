import Player from "./Player.js";

class World {
  constructor(seed) {
    this.state = "INIT";
    this.scene = [];
    this.seed = seed;
  }

  addEntity (id) {
    const e = new Player(id);
    this.scene.push(e);
    return e;
  }

  removeEntity (e) {
    this.scene = this.scene.filter(ent => e !== ent);
  }

  tick() {
    const dead = [];
    this.scene = this.scene.filter(p => {
      if (p.pos.x < 0 || p.pos.x > 100 || p.pos.z < 0 || p.pos.z > 100) {
        dead.push(p.id);
        return false;
      }
      return true;
    });
    return dead;
  }
}
export default World;
