import * as express from "express-serve-static-core";
import * as chalk from "chalk";
import getDataContext from "./get-data-context";

async function apiKeyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const apiKey = req.header("X-ApiKey");
    if (apiKey) {
        // Query db
        const dc = getDataContext(req);
        let result = await dc.clients.getByApiKey(apiKey);
        if (result) {
            (<any>req).user = {
                apiKey: apiKey,
                roles: ["admin"]
            };
        }
    }

    next();
}

export default apiKeyAuth;
