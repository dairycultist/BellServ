const domain = "fatfur.xyz";

let nextBatch = "";

function randomID(length = 6) {

    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    const charCount = characters.length;

    let id = "";

    for (let i=0; i<length; i++) {

        id += characters.charAt(Math.floor(Math.random() * charCount));
    }

    return id;
}

function request() {
    // implement later for server-server communication
}

function respond(req, res, status, body) {

    res.writeHead(status, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET, PUT",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": 2592000, // 30 days
        "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify(body));

    console.log("(" + status + ") " + req.method + " " + req.url);
}

/*
 * onMatch(req, res, db, body, params)
 * - params includes both path params (1, 2, 3...) and query params ("key1", "key2", "key3"...)
 */

const endpoints = [
    {
        // HTML OPTIONS (100% DONE)
        regex: /^OPTIONS .+$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 204, {}); // 204 = No Content, just needs info from headers
        }
    },
    {
        // QUERYING MATRIX API VERSION (100% DONE)
        regex: /^GET \/_matrix\/client\/versions$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                "versions": [
                    "v1.15"
                ]
            });
        }
    },
    {
        // QUERYING APPROPRIATE LOGIN FORMAT (100% DONE)
        regex: /^GET \/_matrix\/client\/v3\/login$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                "flows": [
                    { "type": "m.login.password" }
                ]
            });
        }
    },
    {
        // LOGIN
        // done for now, still need to make sure this access token stuff is generated automatically, and that we can also log into users not on this homeserver
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

                                deviceID = randomID();
                                db.run(`UPDATE Users SET DeviceID = '${deviceID}' WHERE UserIDLocalPart = '${row.UserIDLocalPart}';`);
                            }

                            respond(req, res, 200, {
                                "access_token": accessToken,
                                "device_id": deviceID,
                                "user_id": `@${ row.UserIDLocalPart }:${ domain }`
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
        // KEY UPLOADING
        // done for now, does not store fallback_keys or one_time_keys
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
    {
        // KEY FETCHING
        // done for now (idk what keys are for)
        regex: /POST \/_matrix\/client\/v3\/keys\/query/,
        onMatch: (req, res, db, body, params) => {

            let deviceKeys = {};

            db.each("SELECT UserIDLocalPart, DeviceID, DeviceKeys, DeviceSignatures FROM Users", (err, row) => {

                let userID = `@${ row.UserIDLocalPart }:${ domain }`;

                if (Object.hasOwn(body.device_keys, userID)) {

                    deviceKeys[userID] = {};
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
    {
        // PROFILE FETCHING
        // done for now, should get displayname and avatar_url from db, and should be able to handle requests for profiles on other homeservers
        regex: /^GET \/_matrix\/client\/v3\/profile\/(.+)$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                // "avatar_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgiR49HzZQzRhM6sBgjbtNZmmxHZAm8_lwgw&s", // https://spec.matrix.org/v1.15/client-server-api/#matrix-content-mxc-uris
                "displayname": params[1].split("%3A")[0].substring(3)
            });
        }
    },
    {
        // FILTER REGISTRATION
        // we are simply ignoring filters for now. in the future we should associate a filter and relevant filter information with a User
        regex: /^POST \/_matrix\/client\/v3\/user\/.+\/filter$/,
        onMatch: (req, res, db, body, params) => {

            respond(req, res, 200, {
                "filter_id": "1234"
            });
        }
    },
    {
        // SYNCING CLIENT
        // not even close to done, needs to actually sync content
        regex: /^GET \/_matrix\/client\/v3\/sync.*$/,
        onMatch: (req, res, db, body, params) => {

            let syncClient = (thisBatch) => {

                let rooms = {
                    "invite": {},
                    "join": {},
                    "knock": {},
                    "leave": {}
                };

                // add all public rooms
                db.each("SELECT RoomIDLocalPart, Name, CreationTimestamp, TimelineEvents FROM Rooms WHERE IsPublic=1;", (err, row) => {

                    let roomID = `!${ row.RoomIDLocalPart }:${ domain }`;

                    rooms.join[roomID] = {
                        "state": {
                            "events": [
                                // https://spec.matrix.org/v1.15/client-server-api/#mroomname
                                {
                                    "content": {
                                        "name": row.Name
                                    },
                                    "event_id": "$143273582443PhrSn:" + domain,
                                    "origin_server_ts": row.CreationTimestamp,
                                    "room_id": roomID,
                                    "sender": "@neko:" + domain,
                                    "state_key": "",
                                    "type": "m.room.name"
                                }
                            ]
                        },
                        "timeline": {
                            "events": JSON.parse(row.TimelineEvents)
                        }
                    };

                }, () => {

                    respond(req, res, 200, {
                        "next_batch": thisBatch,
                        "rooms": rooms
                    });
                });
            };

            if (params.timeout == 0) {

                syncClient();

            } else {

                let timeLeft = params.timeout;
            
                // wait for something to have changed before responding, OR for the timeout (in which case we'll respond with empty fields)
                const interval = setInterval(() => {

                    timeLeft -= 2000;

                    if (params.since != nextBatch || timeLeft <= 0) {
                        syncClient(nextBatch); // in case global nextBatch updates before we have a chance to even respond, we pass it now instead of after doing slow db polls
                        clearInterval(interval);
                    }

                }, 2000);
            }
        }
    },
    {
        // USER SEARCHING
        // not done, need to poll other servers given the searched user isn't local to this homeserver, and also match by display_name as well
        regex: /^POST \/_matrix\/client\/v3\/user_directory\/search$/,
        onMatch: (req, res, db, body, params) => {

            let limited = false;
            let results = [];

            db.each("SELECT UserIDLocalPart FROM Users", (err, row) => {

                let userID = `@${ row.UserIDLocalPart }:${ domain }`;

                if (userID.includes(body.search_term))
                    results.push({ "user_id": userID });

            }, () => {

                // ensure we're not over the requested limit
                if (results.length > body.limit) {

                    limited = true;

                    while (results.length > body.limit)
                        results.pop();
                }

                respond(req, res, 200, {
                    "limited": limited,
                    "results": results
                });
            });
        }
    },
    {
        // ROOM CREATION
        // doesn't work with private rooms
        regex: /^POST \/_matrix\/client\/v3\/createRoom$/,
        onMatch: (req, res, db, body, params) => {

            if (body.visibility != "public") {

                respond(req, res, 400, {
                    "errcode": "M_UNKNOWN",
                    "error": "This server currently only supports public rooms!"
                });

                return;
            }

            let roomIDLocalPart = randomID();

            // check if this ID somehow already exists. if it does, just send a 400 error saying to try again
            db.get(`SELECT RoomIDLocalPart FROM Rooms WHERE RoomIDLocalPart='${ roomIDLocalPart }';`, (err, row) => {

                if (!row) {

                    // TODO once we support private rooms, ensure all appropriate users are either joined or invited
                    // no idea how to access the room creator, it's not anywhere in this post request

                    // create room
                    db.run(`INSERT INTO Rooms VALUES ('${ roomIDLocalPart }', '${ body.name ? body.name : "" }', ${ Date.now() }, ${ body.visibility == "public" ? 1 : 0 }, '[]');`);

                    respond(req, res, 200, {
                        "room_id": `!${ roomIDLocalPart }:${ domain }`
                    });

                    nextBatch = randomID(); // change the internal state, allowing sync functions to realize "hey something changed"

                } else {

                    respond(req, res, 400, {
                        "errcode": "M_UNKNOWN",
                        "error": "Please try again."
                    });
                }
            });
        }
    },
    {
        // MESSAGE POSTING TO A ROOM
        regex: /^PUT \/_matrix\/client\/v3\/rooms\/(.+)\/send\/(.+)\/(.+)$/,
        onMatch: (req, res, db, body, params) => {

            if (body.msgtype == "m.text") {

                let messageID = randomID(12);

                // TODO make this actually append real message :)
                // body.body;

                db.run(`UPDATE Rooms SET TimelineEvents = '${
                    
                    `[
                        {
                            "content": {
                                "body": "Welcome to fatfur.xyz!",
                                "format": "org.matrix.custom.html",
                                "formatted_body": "<b>Welcome to fatfur.xyz!</b>",
                                "msgtype": "m.text"
                            },
                            "event_id": "$${ messageID }:${ domain }",
                            "origin_server_ts": 12345,
                            "sender": "@neko:${ domain }",
                            "type": "m.room.message"
                        }
                    ]`

                }' WHERE RoomIDLocalPart = '${ params[1].split("%3A")[0].substring(1) }';`);

                respond(req, res, 200, { "event_id": `$${ messageID }:${ domain }` }); // this should be globally unique, but I'm not doing that right now lol

            } else {

                respond(req, res, 400, {
                    "errcode": "M_UNKNOWN",
                    "error": "This server currently only accepts text messages!"
                });
            }
        }
    }
];

module.exports = {
    respond: respond,
    endpoints: endpoints
};