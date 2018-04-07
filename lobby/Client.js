class Client {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.room;
    this.lastPing = Date.now();
  }

  send(msg) {
    const { ws } = this;
    if (ws.readyState !== ws.OPEN) {
      return false;
    }
    ws.send(JSON.stringify(msg));
    return true;
  }
}

export default Client;
