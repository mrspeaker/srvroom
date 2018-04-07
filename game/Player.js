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
    this.x += input.x;
    this.z += input.z;
  }
}

export default Player;
