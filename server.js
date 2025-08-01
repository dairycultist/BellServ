const fs = require("fs");
const { createServer } = require("node:http"); // https

// const options = {
//     key: fs.readFileSync("../private.key.pem"), // path to ssl PRIVATE key from Porkbun
//     cert: fs.readFileSync("../domain.cert.pem"),// path to ssl certificate from Porkbun
// };

const server = createServer((req, res) => { // options before () for https

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

        case "GET /_matrix/client/v3/login":
            status = 200;
            body = {
                "flows": [
                    { "type": "m.login.password" }
                ]
            };
            break;

        case "OPTIONS /_matrix/client/v3/login":
            status = 204; // No Content, just needs info from headers
            break;
        
        case "POST /_matrix/client/v3/login":
            console.log(req);
            break;
    }

    res.writeHead(status, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": 2592000, // 30 days
        "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify(body));

    console.log("(" + status + ") " + req.method + " " + req.url);
});

server.listen(3000, "localhost", () => { // 443 for https

    console.log(`Starting @ http://localhost:3000/`);
});

