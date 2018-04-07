class Room {
  get count() {
    return this.clients.size;
  }

  constructor(name = "unknown") {
    this.name = name;
    this.clients = new Map();
  }

  join(client) {
    const { clients, name } = this;
    const { id, room } = client;
    if (room) {
      room.leave(client);
    }
    client.room = this;
    clients.set(id, client);
    client.send({action :"JOINED_ROOM", data: name});
  }

  handleMessage(id, msg) {
    this.onMessage && this.onMessage(id, msg);
  }

  leave(client) {
    const { clients, name } = this;
    console.log("leaving", name, client.id);
    client.room = null;
    clients.delete(client.id);
  }

  broadcast(fromId, msg) {
    const { clients } = this;
    clients.forEach(client => {
      const open = client.send(`${fromId}: ${msg}`);
      if (!open) {
        this.leave(client);
      }
    });
  }
}

export default Room;
