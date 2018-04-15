Thinking out loud about an authoritative server implementation. The idea is to make a reusable API for integrating in any game, requiring the minimum amount of changes to the game code itself. Need to figure out the minimum set of rules to make this work.

`npm start`

Starts a server on port 40401 and then serves the /client project via Budo server (localhost:9966 by default).

The client needs to be served because /game code is shared via symlink that doesn't work from file://.
