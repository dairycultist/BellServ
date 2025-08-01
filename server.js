const fs = require("fs");
// const qs = require("querystring");
const { createServer } = require("node:http");
// const { createServer } = require("node:https");

// const options = {
//     key: fs.readFileSync("../private.key.pem"), // path to ssl PRIVATE key from Porkbun
//     cert: fs.readFileSync("../domain.cert.pem"),// path to ssl certificate from Porkbun
// };

const server = createServer((req, res) => { // put options before (req, res)

    var status = 404;
    var body = {};

    switch (req.method + " " + req.url) {

        case "GET /_matrix/client/versions":
            status = 200;
            body = {
                "versions": [
                    "v1.15"
                ]
            };
            break;
    }

    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));

    console.log(req.method + " " + req.url + " >> " + status);
});

server.listen(3000, "localhost", () => { // 443

    console.log(`Starting @ http://localhost:3000/`);
});

