Thinking out loud about an authoritative server implementation

`npm start`

Starts a server on port 40401 and then serves the /client project via Budo server (localhost:9966 by default).

The client needs to be served because /game code is shared via symlink that doesn't work from file://.
