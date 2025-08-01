const fs = require("fs");
const sqlite3 = require("sqlite3").verbose(); // npm install sqlite3
const { createServer } = require("node:http"); // switch to https later
const { respond, endpoints } = require("./respond.js");

// https://www.npmjs.com/package/sqlite3
const db = new sqlite3.Database("db");

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

            const urlParams = new URLSearchParams(req.url);

            for (const [key, value] of urlParams) {
                params[key] = value;
            }

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

