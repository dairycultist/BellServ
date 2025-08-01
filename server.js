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

const endpoints = [ // params is both path params and query params!
    {
        regex: /OPTIONS .+/g,
        onMatch: (req, res, body, params) => {
            respond(req, res, 204, {}); // 204 = No Content, just needs info from headers
        }
    },
    {
        regex: /GET \/_matrix\/client\/v3\/profile\/ .+/g,
        onMatch: (req, res, body, params) => {
            respond(req, res, 200, {
                "avatar_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgiR49HzZQzRhM6sBgjbtNZmmxHZAm8_lwgw&s",
                "displayname": "Test User"
            });
        }
    }
];

const server = createServer((req, res) => { // options before () for https

    const request = req.method + " " + req.url;

    for (endpoint of endpoints) {

        if (request.match(endpoint.regex)) {
            
            endpoint.onMatch(req, res, {}, {});
            return;
        }
    }

    if (request.startsWith("GET /_matrix/client/v3/sync")) {

        respond(req, res, 200, {
            "next_batch": "cat",
            "rooms": {
                "invite": {
                    "!696r7674:example.com": {
                        "invite_state": {
                            "events": [
                                {
                                "content": {
                                    "name": "My Room Name"
                                },
                                "sender": "@alice:example.com",
                                "state_key": "",
                                "type": "m.room.name"
                                },
                                {
                                "content": {
                                    "membership": "invite"
                                },
                                "sender": "@alice:example.com",
                                "state_key": "@bob:example.com",
                                "type": "m.room.member"
                                }
                            ]
                        }
                    }
                }
            }
        });
        return;
    }

    if (request.match(/POST \/_matrix\/client\/v3\/user\/.+\/filter/g)) {

        respond(req, res, 200, {
            "filter_id": "1234"
        });
        return;
    }

    switch (request) {

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

                let signedCount = 0;

                for (format in json.one_time_keys) {
                    signedCount++;
                }
                
                respond(req, res, 200, {
                    "one_time_key_counts": {
                        "signed_curve25519": signedCount
                    }
                });
            });
            return;
    }

    // go through every endpoint to find a match

    // default response if no endpoint is matched
    respond(req, res, 404, {});
});

server.listen(3000, "localhost", () => { // 443 for https

    console.log(`Starting @ http://localhost:3000/`);
});

