const loader = require("esm")(module);
const Rooms = loader("./Rooms.js").default;

describe("Rooms", () => {
  const rooms = new Rooms();
  const roomName = "test";

  test("Creates a lobby on init", () => {
    expect(rooms.rooms.size).toBe(1);
    expect(rooms.lobby).toBeDefined();
  });

  test("Add a room", () => {
    rooms.add(roomName);
    expect(rooms.rooms.size).toBe(2);
    expect(rooms.find(roomName)).toBeDefined();
  });

  test("Remove a room", () => {
    rooms.remove(roomName);
    expect(rooms.rooms.size).toBe(1);
    expect(rooms.find(roomName)).not.toBeDefined();
  });

});
