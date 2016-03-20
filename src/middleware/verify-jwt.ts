import * as express from "express-serve-static-core";
import * as jwt from "jsonwebtoken";
import * as needle from "needle";
import * as chalk from "chalk";
import * as config from "../config";

var certs: any;

function fetchGoogleCerts(cb: () => void): void {
    console.log("Getting OAuth2 certfs from Google...")
    needle.get("https://www.googleapis.com/oauth2/v1/certs", (err, res) => {
        if (!err && res.statusCode == 200) {
            console.log("Successfully got OAuth2 certs from Google.");
            certs = res.body;
            cb();
        } else {
            console.log(chalk.red("Error while loading certs from Google."));
            console.log(chalk.red(`err: ${JSON.stringify(err)}`));
            console.log(chalk.red(`HTTP status code: ${res.statusCode}`));
        }
    });
}

export function google(req: express.Request, res: express.Response, next: express.NextFunction) {
    var authorizationHeader = req.header("Authorization");
    if (authorizationHeader) {
        var indexOfSeparator = authorizationHeader.indexOf(" ");
        if (indexOfSeparator > 0 && authorizationHeader.substring(0, indexOfSeparator) == "Bearer") {
            var token = authorizationHeader.substring(indexOfSeparator + 1);
            var decodedToken = jwt.decode(token, { complete: true });
            if (decodedToken) {
                var fn: (cb: () => void) => void;
                if (!certs) {
                    fn = cb => fetchGoogleCerts(cb);
                }
                else {
                    fn = cb => cb();
                }

                fn(() => {
                    var alg = decodedToken.header.alg;
                    var kid = decodedToken.header.kid;
                    if (certs[kid]) {
                        var cert = certs[kid];
                        try {
                            var verifiedToken = jwt.verify(token, cert, { 
                                audience: config.GOOGLE_APP_ID,
                                issuer: "accounts.google.com" });
                            req.user = verifiedToken;
                            next();
                        } catch (err) {
                            res.status(400).send("Invalid JWT.");
                            console.log(chalk.red("Error while verifying token."));
                            console.log(chalk.red(`err: ${JSON.stringify(err)}`));
                        }
                    } else {
                        res.status(500).send("Could not get cert from Google.");
                    }
                });
            } else {
                res.status(400).send("Could not decode JWT.");
            }
        } else {
            res.status(400).send("Invalid token format, only Bearer is supported.");
        }
    } else {
        res.status(401).send("Missing authorization token.");
    }
}
