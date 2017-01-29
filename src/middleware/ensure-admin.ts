import * as express from "express-serve-static-core";
import * as chalk from "chalk";
import getDataContext from "./get-data-context";

async function ensureAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!(<any>req).user) {
        throw "Not authenticated";
    }

    if (!(<any>req).user.sub) {
        throw "Google subject not found in token.";

    }

    let participants = getDataContext(req).participants;
    if (await participants.isAdmin((<any>req).user.sub)) {
        next();
    } else {
        res.status(401).send({ message: "User is no administrator." })
    }
}

export default ensureAdmin;