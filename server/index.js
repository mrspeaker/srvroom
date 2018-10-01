import Server from "../lobby/Server.js";
import env from "../game/env.js";
import ServerGame from "./ServerGame.js";

const server = new Server(env.port);
const { rooms } = server;
const games = new Map();

/*
  This file contains all the coordination logic for setting up and
  bringing down games with rooms. Need to figure out what should be in
  an API and what should be per-game.
*/

// Send Client ID to client.
server.onClientConnect = client =>
  client.ws.send(
    JSON.stringify({
      action: "CONNECTED",
      id: client.id
    })
  );

// Match making
rooms.onEnterLobby = () => {
  if (rooms.lobby.count >= 2) {
    addGame(rooms.lobby.clients, makeRoom());
  }
};

// Game events
const onClientLeft = client => rooms.addToLobby(client);
const onGameOver = room => {
  games.delete(room.name);
  rooms.remove(room.name);
};
const makeRoom = (() => {
  let world_id = 0;
  return () => rooms.add("world" + ++world_id);
})();
const addGame = (clients, room) => {
  clients.forEach(c => room.join(c));
  games.set(room.name, new ServerGame(room, onClientLeft, onGameOver));
};
