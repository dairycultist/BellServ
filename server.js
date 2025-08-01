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

function passReqBody(req, res, func) {

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

    if (req.method == "OPTIONS") {

        respond(req, res, 204, {}); // 204 = No Content, just needs info from headers
        return;
    }

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
        
        case "POST /_matrix/client/v3/login":
            passReqBody(req, res, (json) => {
                
                if (json.type == "m.login.password" && json.identifier.type == "m.id.user") {

                    console.log(json.identifier.user + " logging in with password " + json.password);

                    respond(req, res, 200, {
                        "access_token": "abc123", // this access token is used to authorize other requests. we should store it, and associate it with the account that just logged in
                        "device_id": json.device_id ? json.device_id : "device" + Math.floor(Math.random() * 10000),
                        "user_id": "@test:fatfur.xyz"
                    });

                    // respond 403 if the login authentication data was incorrect

                } else {
                    respond(req, res, 400, { "errcode": "M_UNKNOWN", "error": "Invalid request: Bad login type." });
                }
            });
            return;
        
        case "POST /_matrix/client/v3/keys/upload":
            passReqBody(req, res, (json) => {
                
                respond(req, res, 200, { "one_time_key_counts": {} });
            });
            return;
    }

    // default response
    respond(req, res, 404, {});
});

server.listen(3000, "localhost", () => { // 443 for https

    console.log(`Starting @ http://localhost:3000/`);
});

