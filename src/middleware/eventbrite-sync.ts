/// <reference path="../../typings/index.d.ts" />
import * as express from "express";
import getDataContext from "./get-data-context";
import synchronize from "../dataAccess/eventbrite-sync";

async function eventbriteSync(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let dc = getDataContext(req);
        await synchronize(dc);
        res.status(200).end();
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export default eventbriteSync;