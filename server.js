const fs = require("fs");
// const qs = require("querystring");
const { createServer } = require("node:https");

const options = {
    key: fs.readFileSync("../private.key.pem"), // path to ssl PRIVATE key from Porkbun
    cert: fs.readFileSync("../domain.cert.pem"),// path to ssl certificate from Porkbun
};

const server = createServer(options, (req, res) => {

    var status = 404;
    var body = {};

    switch (req.method + " " + req.url) {

        case "GET /_matrix/client/versions":
            status = 200;
            body = {
                "versions": [
                    "r0.0.1",
                    "r0.1.0",
                    "r0.2.0",
                    "r0.3.0",
                    "r0.4.0",
                    "r0.5.0",
                    "r0.6.0",
                    "r0.6.1",
                    "v1.1",
                    "v1.2",
                    "v1.3",
                    "v1.4",
                    "v1.5",
                    "v1.8",
                    "v1.11",
                    "v1.12",
                    "v1.13",
                    "v1.14"
                ]
            };
            break;
    }

    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));

    console.log("(" + status + ") " + req.method + " " + req.url);
});

server.listen(443, () => {

    console.log(`Starting @ http://0.0.0.0:443/`);
});

