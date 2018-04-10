class Bot {
  constructor(player, send) {
    this.player = player;
    this.send = send;
    player.bot = true;
  }
  update() {
    const xo = (Math.random() * 2 - 1) * 0.5;
    const yo = Math.random();
    const input = { action: "INPUT", xo, yo};
    this.send(this.player.id, input, true);
  }
}

export default Bot;
