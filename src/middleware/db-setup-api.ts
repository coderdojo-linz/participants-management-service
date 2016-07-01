/// <reference path="../../typings/index.d.ts" />
import * as express from "express";
import dbSetup from "../dataAccess/db-setup";
import * as config from "../config";

async function setupDb(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        await dbSetup(config.MONGO_URL, {
            givenName: req.user.given_name,
            familyName: req.user.family_name,
            email: req.user.email,
            googleSubject: req.user.sub
        });
        res.status(200).end();
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export default setupDb;