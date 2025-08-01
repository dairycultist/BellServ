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

/*
 * onMatch(req, res, db, body, params)
 * - params includes both path params (0, 1, 2...) and query params ("key1", "key2", "key3"...)
 */

const endpoints = [
    { // DONE IMPLEMENTING
        regex: /^OPTIONS .+$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 204, {}); // 204 = No Content, just needs info from headers
        }
    },
    { // DONE IMPLEMENTING
        regex: /^GET \/_matrix\/client\/versions$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                "versions": [
                    "v1.15"
                ]
            });
        }
    },
    { // DONE IMPLEMENTING
        regex: /^GET \/_matrix\/client\/v3\/login$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                "flows": [
                    { "type": "m.login.password" }
                ]
            });
        }
    },
    { // done for now, still need to make sure this access token stuff is generated automatically, and that we can also log into users not on this homeserver
        regex: /^POST \/_matrix\/client\/v3\/login$/,
        onMatch: (req, res, db, body, params) => {

            if (body.type == "m.login.password" && body.identifier.type == "m.id.user") {

                // attempt to login
                db.each("SELECT UserIDLocalPart, Password, AccessToken, DeviceID FROM Users", (err, row) => {

                    if (body.identifier.user == row.UserIDLocalPart && body.password == row.Password) {
                        
                        respond(req, res, 200, {
                            "access_token": row.AccessToken, // this access token is used to authorize other requests
                            "device_id":
                                body.device_id ? body.device_id                 // client provided device_id
                                : row.DeviceID != "" ? row.DeviceID             // we have a device_id in the db
                                : "device" + Math.floor(Math.random() * 10000), // generate a device_id
                            "user_id": `@${row.UserIDLocalPart}:fatfur.xyz`
                        });
                        return;
                    }
                });

                // respond 403 if login authentication data did not match any user
                respond(req, res, 403, { "errcode": "M_FORBIDDEN", "error": "Invalid request: Username or password incorrect." });

            } else {
                respond(req, res, 400, { "errcode": "M_UNKNOWN", "error": "Invalid request: Bad login type." });
            }
        }
    },
    // {
    //     regex: /^GET \/_matrix\/client\/v3\/profile\/(.+)$/,
    //     onMatch: (req, res, db, body, params) => {

    //         respond(req, res, 200, {
    //             "avatar_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgiR49HzZQzRhM6sBgjbtNZmmxHZAm8_lwgw&s",
    //             "displayname": "Test User"
    //         });
    //     }
    // },
    // {
    //     regex: /^GET \/_matrix\/client\/v3\/sync.*$/,
    //     onMatch: (req, res, db, body, params) => {

    //         respond(req, res, 200, {
    //             "next_batch": "cat",
    //             "rooms": {
    //                 "invite": {
    //                     "!696r7674:example.com": {
    //                         "invite_state": {
    //                             "events": [
    //                                 {
    //                                 "content": {
    //                                     "name": "My Room Name"
    //                                 },
    //                                 "sender": "@alice:example.com",
    //                                 "state_key": "",
    //                                 "type": "m.room.name"
    //                                 },
    //                                 {
    //                                 "content": {
    //                                     "membership": "invite"
    //                                 },
    //                                 "sender": "@alice:example.com",
    //                                 "state_key": "@bob:example.com",
    //                                 "type": "m.room.member"
    //                                 }
    //                             ]
    //                         }
    //                     }
    //                 }
    //             }
    //         });
    //     }
    // },
    // {
    //     regex: /^POST \/_matrix\/client\/v3\/user\/.+\/filter$/,
    //     onMatch: (req, res, db, body, params) => {

    //         respond(req, res, 200, {
    //             "filter_id": "1234"
    //         });
    //     }
    // },
    // {
    //     regex: /^POST \/_matrix\/client\/v3\/keys\/upload$/,
    //     onMatch: (req, res, db, body, params) => {

    //         let signedCount = 0;

    //         for (format in body.one_time_keys) {
    //             signedCount++;
    //         }
            
    //         respond(req, res, 200, {
    //             "one_time_key_counts": {
    //                 "signed_curve25519": signedCount
    //             }
    //         });
    //     }
    // },
];

module.exports = {
    respond: respond,
    endpoints: endpoints
};