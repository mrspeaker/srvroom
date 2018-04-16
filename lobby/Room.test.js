const loader = require("esm")(module);
const Room = loader("./Room.js").default;

describe("Room", () => {
  const room = new Room("test");

  test("Create a room", () => {
    expect(room.name).toBe("test");
  });
});
