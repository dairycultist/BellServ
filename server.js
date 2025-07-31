const fs = require("fs");
// const qs = require("querystring");
const { createServer } = require("node:https");

const options = {
    key: fs.readFileSync('private.key.pem'), // path to ssl PRIVATE key from Porkbun
    cert: fs.readFileSync('domain.cert.pem'),// path to ssl certificate from Porkbun
};

const server = createServer(options, (req, res) => {

    // All JSON data, in requests or responses, must be encoded using UTF-8.

    console.log(req.method + " : " + req.url);

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end("{}");
});

server.listen(443, () => {

    console.log(`Starting @ http://0.0.0.0:443/`);
});

