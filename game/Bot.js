/*
  Bots will need a way to convey their inputs to the server.
  Here I've passed in "send" as a function, but it means the end user
  of the lib needs to know how this works - i think better is a convention
  of like, "store inputs in a var `input`" and it gets processed.
*/
class Bot {
  constructor(player, send) {
    this.id = player.id;
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
