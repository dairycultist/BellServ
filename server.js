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

const endpoints = [ // params is both path params and query params!
    {
        regex: /^OPTIONS .+$/,
        onMatch: (req, res, body, params) => {

            respond(req, res, 204, {}); // 204 = No Content, just needs info from headers
        }
    },
    {
        regex: /^GET \/_matrix\/client\/v3\/profile\/(.+)$/,
        onMatch: (req, res, body, params) => {

            respond(req, res, 200, {
                "avatar_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgiR49HzZQzRhM6sBgjbtNZmmxHZAm8_lwgw&s",
                "displayname": "Test User"
            });
        }
    },
    {
        regex: /^GET \/_matrix\/client\/v3\/sync.*$/,
        onMatch: (req, res, body, params) => {

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
        }
    },
    {
        regex: /^POST \/_matrix\/client\/v3\/user\/.+\/filter$/,
        onMatch: (req, res, body, params) => {

            respond(req, res, 200, {
                "filter_id": "1234"
            });
        }
    },
    {
        regex: /^GET \/_matrix\/client\/versions$/,
        onMatch: (req, res, body, params) => {

            respond(req, res, 200, {
                "versions": [
                    "v1.15"
                ]
            });
        }
    },
    {
        regex: /^GET \/_matrix\/client\/v3\/login$/,
        onMatch: (req, res, body, params) => {

            respond(req, res, 200, {
                "flows": [
                    { "type": "m.login.password" }
                ]
            });
        }
    },
    {
        regex: /^POST \/_matrix\/client\/v3\/login$/,
        onMatch: (req, res, body, params) => {

            if (body.type == "m.login.password" && body.identifier.type == "m.id.user") {

                console.log(body.identifier.user + " logging in with password " + body.password);

                respond(req, res, 200, {
                    "access_token": "abc123", // this access token is used to authorize other requests. we should store it, and associate it with the account that just logged in
                    "device_id": body.device_id ? body.device_id : "device" + Math.floor(Math.random() * 10000),
                    "user_id": "@test:fatfur.xyz"
                });

                // respond 403 if the login authentication data was incorrect

            } else {
                respond(req, res, 400, { "errcode": "M_UNKNOWN", "error": "Invalid request: Bad login type." });
            }
        }
    },
    {
        regex: /^POST \/_matrix\/client\/v3\/keys\/upload$/,
        onMatch: (req, res, body, params) => {

            let signedCount = 0;

            for (format in body.one_time_keys) {
                signedCount++;
            }
            
            respond(req, res, 200, {
                "one_time_key_counts": {
                    "signed_curve25519": signedCount
                }
            });
        }
    },
];

const server = createServer((req, res) => { // options before () for https

    const request = req.method + " " + req.url;

    // go through every endpoint to find a match
    for (let endpoint of endpoints) {

        if (request.match(endpoint.regex)) {

            let body = "";

            req.on("data", chunk => {
                body += chunk.toString();
            });

            req.on("end", () => {
                try {
                    endpoint.onMatch(req, res, JSON.parse(body), {});
                } catch (error) {
                    endpoint.onMatch(req, res, {}, {}); // assume body doesn't exist, and NOT that the JSON is formatted incorrectly
                }
            });

            return;
        }
    }

    // default response if no endpoint is matched
    respond(req, res, 404, {});
});

server.listen(3000, "localhost", () => { // 443 for https

    console.log(`Starting @ http://localhost:3000/`);
});

