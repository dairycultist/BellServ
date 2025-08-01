const fs = require("fs");
const sqlite3 = require("sqlite3").verbose(); // npm install sqlite3
const { createServer } = require("node:http"); // switch to https later
const { respond, endpoints } = require("./respond.js");

const db = new sqlite3.Database(":memory:"); // https://www.npmjs.com/package/sqlite3

db.serialize(() => {

    db.run("CREATE TABLE Users (UserIDLocalPart TEXT, Password TEXT, AccessToken TEXT, DeviceID TEXT);");

    // insert test users
    db.run("INSERT INTO Users VALUES ('neko', 'password123', 'abc', 'device0');");
    db.run("INSERT INTO Users VALUES ('tori', 'unsafepass', 'xyz', 'device1');");

    db.each("SELECT UserIDLocalPart, Password FROM Users", (err, row) => {
        console.log(row.UserIDLocalPart + ": " + row.Password);
    });
});

// const options = {
//     key: fs.readFileSync("../private.key.pem"), // path to ssl PRIVATE key from Porkbun
//     cert: fs.readFileSync("../domain.cert.pem"),// path to ssl certificate from Porkbun
// };

createServer((req, res) => { // options before () for https

    const request = req.method + " " + req.url;

    // go through every endpoint to find a match
    for (let endpoint of endpoints) {

        if (request.match(endpoint.regex)) {

            let body = "";
            let params = {};

            // populate path parameters (TODO)

            // populate url parameters
            const urlParams = new URLSearchParams(req.url);

            for (const [key, value] of urlParams) {
                params[key] = value;
            }

            // populate body and call endpoint
            req.on("data", chunk => {
                body += chunk.toString();
            });

            req.on("end", () => {
                try {
                    endpoint.onMatch(req, res, db, JSON.parse(body), {});
                } catch (error) {
                    endpoint.onMatch(req, res, db, {}, {}); // assume body doesn't exist, and NOT that the JSON is formatted incorrectly
                }
            });

            return;
        }
    }

    // default response if no endpoint is matched
    respond(req, res, 404, {});

// 443 for https
}).listen(3000, "localhost", () => { console.log(`Starting @ http://localhost:3000/`); });

