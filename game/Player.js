class Player {
  constructor(id) {
    this.id = id;
    this.pos = {
      x: 0,
      z: 0
    };
    this.xo = 0;
    this.zo = 0;
  }

  update(input) {
    this.pos.x += input.x;
    this.pos.z += input.z;
  }
}

export default Player;
