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
    if (input.xo) {
      this.pos.x += input.xo;
    }
    if (input.zo) {
      this.pos.z += input.zo;
    }
  }
}

export default Player;
