import * as express from "express-serve-static-core";
import * as chalk from "chalk";
import getDataContext from "./get-data-context";

async function ensureAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = (<any>req).user;
    if (!user) {
        res.status(401).send({ message: "Not authenticated" });
        return;
    }

    if (!user.roles || !Array.isArray(user.roles)) {
        res.status(400).send({ message: "No roles in token" });
        return;
    }

    if ((<string[]>(user.roles)).indexOf("admin") === (-1)) {
        res.status(403).send({ message: "User is no administrator." });
        return;
    }

    next();
}

export default ensureAdmin;