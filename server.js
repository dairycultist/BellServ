const fs = require("fs");
const { createServer } = require("node:http"); // https

// const options = {
//     key: fs.readFileSync("../private.key.pem"), // path to ssl PRIVATE key from Porkbun
//     cert: fs.readFileSync("../domain.cert.pem"),// path to ssl certificate from Porkbun
// };

function respond(req, res, status, body) {

    res.writeHead(status, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": 2592000, // 30 days
        "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify(body));

    console.log("(" + status + ") " + req.method + " " + req.url);
}

function passReqBody(req, func) {

    let body = "";

    req.on("data", chunk => {
        body += chunk.toString();
    });

    req.on("end", () => {
        try {
            func(JSON.parse(body));
        } catch (error) {
            respond(req, res, 400, {}); // invalid request (bad JSON)
        }
    });
}

const server = createServer((req, res) => { // options before () for https

    switch (req.method + " " + req.url) {

        case "GET /_matrix/client/versions":
            respond(req, res, 200, {
                "versions": [
                    "v1.15"
                ]
            });
            return;

        case "GET /_matrix/client/v3/login":
            respond(req, res, 200, {
                "flows": [
                    { "type": "m.login.password" }
                ]
            });
            return;

        case "OPTIONS /_matrix/client/v3/login":
            respond(req, res, 204, {}); // 204 = No Content, just needs info from headers
            return;
        
        case "POST /_matrix/client/v3/login":
            passReqBody(req, (json) => {
                
                if (json.type == "m.login.password") {
                    console.log(json);
                } else {
                    respond(req, res, 400, {}); // invalid request (wrong login type)
                }
            });
            return;
    }

    // default response
    respond(req, res, 404, {});
});

server.listen(3000, "localhost", () => { // 443 for https

    console.log(`Starting @ http://localhost:3000/`);
});

