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
                let loginSuccessful = false;

                db.serialize(() => {
                    db.each("SELECT UserIDLocalPart, Password, AccessToken, DeviceID FROM Users", (err, row) => {

                        if (!loginSuccessful && body.identifier.user == row.UserIDLocalPart && body.password == row.Password) {

                            let accessToken = row.AccessToken; // this access token is used to authorize other requests
                            let deviceID;

                            if (body.device_id) { // set our db's DeviceID to what the client sent us

                                deviceID = body.device_id;
                                db.run(`UPDATE Users SET DeviceID = '${deviceID}' WHERE UserIDLocalPart = '${row.UserIDLocalPart}';`);

                            } else if (row.DeviceID != "") { // use the DeviceID we store

                                deviceID = row.DeviceID;

                            } else { // generate a new DeviceID

                                deviceID = "device" + Math.floor(Math.random() * 10000);
                                db.run(`UPDATE Users SET DeviceID = '${deviceID}' WHERE UserIDLocalPart = '${row.UserIDLocalPart}';`);
                            }

                            respond(req, res, 200, {
                                "access_token": accessToken,
                                "device_id": deviceID,
                                "user_id": `@${row.UserIDLocalPart}:fatfur.xyz`
                            });
                            loginSuccessful = true;
                        }

                    }, () => { // called on complete
                        
                        // respond 403 if login authentication data did not match any user
                        if (!loginSuccessful)
                            respond(req, res, 403, { "errcode": "M_FORBIDDEN", "error": "Invalid request: Username or password incorrect." });
                    });
                });

            } else {
                respond(req, res, 400, { "errcode": "M_UNKNOWN", "error": "Invalid request: Bad login type." });
            }
        }
    },
    {
        regex: /^POST \/_matrix\/client\/v3\/keys\/upload$/,
        onMatch: (req, res, db, body, params) => {

            // store DeviceKeys and DeviceSignatures in db as stringified JSON to respond with once queried for them
            if (body.device_keys)
                db.run(`UPDATE Users SET DeviceKeys = '${JSON.stringify(body.device_keys.keys)}', DeviceSignatures = '${JSON.stringify(body.device_keys.signatures)}' WHERE DeviceID = '${body.device_keys.device_id}';`);

            // count one_time_keys for response (not storing them since idk what they're for)
            let oneTimeKeyCount = 0;

            for (format in body.one_time_keys)
                if (format.startsWith("signed_curve25519"))
                    oneTimeKeyCount++;
            
            respond(req, res, 200, {
                "one_time_key_counts": {
                    "signed_curve25519": oneTimeKeyCount
                }
            });
        }
    },
    { // 
        regex: /POST \/_matrix\/client\/v3\/keys\/query/,
        onMatch: (req, res, db, body, params) => {

            let deviceKeys = {};

            db.each("SELECT UserIDLocalPart, DeviceID, DeviceKeys, DeviceSignatures FROM Users", (err, row) => {

                let userID = `@${ row.UserIDLocalPart }:fatfur.xyz`;

                if (Object.hasOwn(body.device_keys, userID)) {

                    deviceKeys[userID][row.DeviceID] = {
                        "algorithms": [ "curve25519", "ed25519" ],
                        "user_id": userID,
                        "device_id": row.DeviceID,
                        "keys": JSON.parse(row.DeviceKeys),
                        "signatures": JSON.parse(row.DeviceSignatures)
                    };

                    delete body.device_keys[userID];
                }

            }, () => {

                // need to check if some of the requested device_keys are associated with users not on this homeserver
                // aka if body.device_keys isn't empty by the time we reach this point

                respond(req, res, 200, { "device_keys": deviceKeys });
            });

        }
    },
    { // done for now, should get displayname and avatar_url from db, and should be able to handle requests for profiles on other homeservers
        regex: /^GET \/_matrix\/client\/v3\/profile\/(.+)$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                "avatar_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgiR49HzZQzRhM6sBgjbtNZmmxHZAm8_lwgw&s",
                "displayname": params[1].split("%3A")[0].substring(3)
            });
        }
    },
    { // we are simply ignoring filters for now. in the future we should associate a filter and relevant filter information with a User
        regex: /^POST \/_matrix\/client\/v3\/user\/.+\/filter$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                "filter_id": "1234"
            });
        }
    },
    { // not even close to done
        regex: /^GET \/_matrix\/client\/v3\/sync.*$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                "next_batch": "cat",
                "rooms": {
                    // "join": {
                    //     "roomid_localpart:fatfur.xyz": {
                    //         "summary": {
                    //             "m.heroes": [ "@tori:fatfur.xyz" ],
                    //             "m.invited_member_count": 0,
                    //             "m.joined_member_count": 2
                    //         },
                    //         "timeline": {
                    //             events: [
                    //                 {
                    //                     "content": {
                    //                         "body": "Welcome to fatfur.xyz!",
                    //                         "format": "org.matrix.custom.html",
                    //                         "formatted_body": "<b>Welcome to fatfur.xyz!</b>",
                    //                         "msgtype": "m.text"
                    //                     },
                    //                     "event_id": "$123:fatfur.xyz", // should be globally unique across ALL homeservers
                    //                     "origin_server_ts": 1432735824653,
                    //                     "sender": "@neko:fatfur.xyz",
                    //                     "type": "m.room.message"
                    //                 }
                    //             ]
                    //         }
                    //     }
                    // }
                }
            });

        }
    },
];

module.exports = {
    respond: respond,
    endpoints: endpoints
};