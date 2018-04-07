import Room from "./Room.js";

class Rooms {
  constructor() {
    this.rooms = {
      lobby: new Room(Rooms.LOBBY)
    };
  }

  get lobby() {
    return this.rooms.lobby;
  }

  addToLobby(client) {
    if (client.room) {
      client.room.leave(client);
    }
    this.rooms.lobby.join(client);
    this.onEnterLobby && this.onEnterLobby(client);
  }

  add(name) {
    const room = new Room(name);
    this.rooms[name] = room;
    return room;
  }

  remove(name) {
    const room = this.rooms[name];
    if (!room || name === Rooms.LOBBY) return;
    room.clients.forEach(c => this.addToLobby(c));
    delete this.rooms[room];
  }
}
Rooms.LOBBY = "lobby";

export default Rooms;
