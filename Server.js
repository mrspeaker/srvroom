import WebSocket from "ws";
import Client from "./Client.js";
import Rooms from "./Rooms.js";

class Server {
  constructor(port) {
    this.id = 0;
    this.rooms = new Rooms();
    this.clients = new Map();
    const wss = new WebSocket.Server({ port });
    wss.on("connection", ws => this.connection(ws));

    setInterval(() => this.heartbeat(), 4500);
  }

  removeClient(client) {
    const { id, ws, room } = client;
    console.log("removing", id);
    if (room) {
      room.leave(client);
    }
    if (ws.readyState === ws.OPEN) {
      ws.close();
    }
    this.clients.delete(id);
  }

  heartbeat() {
    const { clients } = this;
    console.log("heartbeat");
    clients.forEach(c => {
      const { ws, lastPing, id } = c;
      const time = Date.now() - lastPing;

      if (ws.readyState !== ws.OPEN) {
        console.log("closed connection", id);
        this.removeClient(c);
        return;
      }
      if (time >= 15000) {
        // Disconnect.
        console.log("disconnect", id);
        this.removeClient(c);
        return;
      }
      if (time >= 5000) {
        console.log("pinged", id);
        ws.ping();
      }
    });
  }

  connection(ws) {
    const { clients, rooms } = this;
    const client = new Client(++this.id, ws);
    clients.set(client.id, client);
    rooms.addToLobby(client);
    ws.on("message", msg => {
      this.handleMessage(client, msg);
      client.lastPing = Date.now();
    });
    ws.on("close", () => {
      console.log("CLOSE CLOSE CLOSE CLOSE");
      this.removeClient(client);
    });
    ws.on("pong", () => {
      client.lastPing = Date.now();
    });
    if (this.onClientConnect) {
      this.onClientConnect(ws);
    }
  }

  handleMessage(client, msg) {
    const { id, ws, room } = client;
    console.log("svr msg", id, msg, room.name);
    if (room) {
      room.handleMessage(id, msg);
    }
    return ws;
  }
}

export default Server;
