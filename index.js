/* Sets up ESM for native module support */
require = require("esm")(module);
module.exports = require("./server/index.js").default;
