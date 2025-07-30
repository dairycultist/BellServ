const fs = require("fs");
const qs = require("querystring");
const { createServer } = require("node:http");

const server = createServer((req, res) => {

    console.log(req.method + " : " + req.url);

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Internal Server Error");
});

server.listen(3000, "127.0.0.1", () => {

    console.log(`Starting @ http://127.0.0.1:3000/`);
});
