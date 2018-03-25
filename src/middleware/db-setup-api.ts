import * as express from "express";
import dbSetup from "../dataAccess/db-setup";
import * as config from "../config";

async function setupDb(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        await dbSetup(config.MONGO_URL, config.MONGO_DB, {
            givenName: (<any>req).user.given_name,
            familyName: (<any>req).user.family_name,
            email: (<any>req).user.email,
            googleSubject: (<any>req).user.sub
        });
        res.status(200).end();
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export default setupDb;