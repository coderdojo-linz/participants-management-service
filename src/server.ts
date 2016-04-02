import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import googleDevSignin from "./middleware/dev-token";
import verifyGoogleJwt from "./middleware/verify-jwt";
import ensureAdmin from "./middleware/ensure-admin";
import * as config from "./config";
import reviver from "./middleware/reviver";
import addDataContext from "./middleware/add-data-context";
import * as eventApi from "./middleware/events-api";
import * as participantsApi from "./middleware/participants-api";
import setupDb from "./middleware/db-setup-api";

var app = express();

// Create express server
app.use(cors());
var bodyParserOptions = { reviver: reviver };
app.use(bodyParser.json(bodyParserOptions));
app.use(googleDevSignin);  // Login page for dev-purposes at /auth/devToken

// Endpoint for initializing the DB. Will return an error if DB already initialized
app.get("/admin/db-setup", verifyGoogleJwt, setupDb);

// Events API
app.get("/api/events", eventApi.getAll);
app.get("/api/events/:_id", eventApi.getById);
app.post("/api/events", verifyGoogleJwt, ensureAdmin, eventApi.add);

// Participants API
app.get("/api/participants/summary", verifyGoogleJwt, ensureAdmin, participantsApi.getAllSummary);
app.post("/api/participants", verifyGoogleJwt, ensureAdmin, participantsApi.add);

// Start express server
var port: number = process.env.port || 1337;
addDataContext(config.MONGO_URL, app, () => {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
});