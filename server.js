const fs = require("fs");
const sqlite3 = require("sqlite3").verbose(); // npm install sqlite3
const { createServer } = require("node:http"); // switch to https later
const { respond, endpoints } = require("./respond.js");

const db = new sqlite3.Database("db"); // https://www.npmjs.com/package/sqlite3

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Users';", (err, row) => {
    
    // create Users table if it doesn't exist
    if (!row) {
        
        // we assume the user only has one device lol
        db.run("CREATE TABLE Users (UserIDLocalPart TEXT, Password TEXT, AccessToken TEXT, DeviceID TEXT, DeviceKeys TEXT, DeviceSignatures TEXT);");

        // insert test users
        db.run("INSERT INTO Users VALUES ('neko', 'password123', 'abc', '', '{}', '{}');");
        db.run("INSERT INTO Users VALUES ('tori', 'unsafepass', 'xyz', '', '{}', '{}');");
    }
});

// const options = {
//     key: fs.readFileSync("../private.key.pem"), // path to ssl PRIVATE key from Porkbun
//     cert: fs.readFileSync("../domain.cert.pem"),// path to ssl certificate from Porkbun
// };

createServer((req, res) => { // options before () for https

    const request = req.method + " " + req.url;

    // go through every endpoint to find a match
    for (let endpoint of endpoints) {

        let matched;

        if (matched = request.match(endpoint.regex)) {

            let body = "";
            let params = {};

            // populate path parameters (matched 0 is the matched string, 1+ are the capture groups)
            for (let i = 1; i < matched.length; i++) {
                params[i] = matched[i];
            }

            // populate url parameters
            if (req.url.includes("?")) {
                const urlParams = new URLSearchParams(req.url.split("?", 2)[1]);

                for (const [key, value] of urlParams) {
                    params[key] = value;
                }
            }

            // populate body and call endpoint
            req.on("data", chunk => {
                body += chunk.toString();
            });

            req.on("end", () => {
                try {
                    endpoint.onMatch(req, res, db, JSON.parse(body), params);
                } catch (error) {
                    endpoint.onMatch(req, res, db, {}, params); // assume body doesn't exist, and NOT that the JSON is formatted incorrectly
                }
            });

            return;
        }
    }

    // default response if no endpoint is matched
    respond(req, res, 404, {});

// 443 for https
}).listen(3000, "localhost", () => { console.log(`Starting @ http://localhost:3000/`); });

