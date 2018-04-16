import Room from "./Room.js";

class Rooms {
  constructor() {
    this.rooms = new Map();
    this.add(Rooms.LOBBY);
  }

  find (name) {
    return this.rooms.get(name);
  }

  get lobby() {
    return this.find(Rooms.LOBBY);
  }

  addToLobby(client) {
    if (client.room) {
      client.room.leave(client);
    }
    this.lobby.join(client);
    this.onEnterLobby && this.onEnterLobby(client);
  }

  add(name) {
    const room = new Room(name);
    this.rooms.set(name, room);
    return room;
  }

  remove(name) {
    const { rooms } = this;
    const room = this.find(name);
    if (!room || name === Rooms.LOBBY) return;
    room.clients.forEach(c => this.addToLobby(c));
    rooms.delete(name);
  }
}
Rooms.LOBBY = "lobby";

export default Rooms;
