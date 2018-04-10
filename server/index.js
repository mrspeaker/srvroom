import Server from "../lobby/Server.js";
import env from "../game/env.js";
import ServerGame from "./ServerGame.js";

const server = new Server(env.port);
const { rooms } = server;
const games = new Map();

server.onClientConnect = client =>
  client.ws.send(
    JSON.stringify({
      action: "CONNECTED",
      id: client.id
    })
  );

rooms.onEnterLobby = () => {
  if (rooms.lobby.count >= 2) {
    addGame(rooms.lobby.clients, makeRoom());
  }
};

const onClientLeft = client => rooms.addToLobby(client);
const onGameOver = room => {
  games.delete(room.name);
  // rooms.delete(room.name) ?
};
const makeRoom = (() => {
  let world_id = 0;
  return () => rooms.add("world" + ++world_id);
})();
const addGame = (clients, room) => {
  clients.forEach(c => room.join(c));
  games.set(room.name, new ServerGame(room, onClientLeft, onGameOver));
};
