const fs = require("fs");
const qs = require("querystring");
const { createServer } = require("node:http");

// All JSON data, in requests or responses, must be encoded using UTF-8.

const server = createServer((req, res) => {

    console.log(req.method + " : " + req.url);

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Internal Server Error");
});

server.listen(8448, "127.0.0.1", () => { // port for SSL

    console.log(`Starting @ http://127.0.0.1:8448/`);
});
