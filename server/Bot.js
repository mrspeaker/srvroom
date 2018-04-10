class Bot {
  constructor(player, send) {
    this.player = player;
    this.send = send;
    player.bot = true;
  }
  update() {
    const xo = (Math.random() * 2 - 1) * 0.2;
    const zo = (Math.random() * 2 - 1) * 0.2;
    const input = { action: "INPUT", xo: xo * 8, zo: zo * 8 };
    this.send(this.player.id, input, true);
  }
}

export default Bot;
