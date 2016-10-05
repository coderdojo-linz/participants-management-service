import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import googleDevSignin from "./middleware/dev-token";
import verifyGoogleJwt from "./middleware/verify-jwt";
import ensureAdmin from "./middleware/ensure-admin";
import eventbriteSync from "./middleware/eventbrite-sync";
import * as config from "./config";
import reviver from "./middleware/reviver";
import addDataContext from "./middleware/add-data-context";
import * as eventApi from "./middleware/events-api";
import * as participantsApi from "./middleware/participants-api";
import setupDb from "./middleware/db-setup-api";
import * as appinsights from "applicationinsights";

appinsights.setup(config.APP_INSIGHTS_KEY).start();

var app = express();

// Create express server
app.use(cors());
var bodyParserOptions = { reviver: reviver };
app.use(bodyParser.json(bodyParserOptions));
app.use(googleDevSignin);  // Login page for dev-purposes at /auth/devToken

// Endpoint for initializing the DB. Will return an error if DB already initialized
app.get("/admin/db-setup", verifyGoogleJwt, setupDb);

// Endpoint for triggering Eventbrite sync
app.post("/admin/eventbrite-sync", verifyGoogleJwt, ensureAdmin, eventbriteSync);

// Events API
app.get("/api/events", eventApi.getAll);
app.get("/api/events/:_id", eventApi.getById);
app.post("/api/events", verifyGoogleJwt, ensureAdmin, eventApi.add);
app.get("/api/events/:_id/registrations", verifyGoogleJwt, ensureAdmin, eventApi.getRegistrations);
app.post("/api/events/:_id/registrations", verifyGoogleJwt, ensureAdmin, eventApi.addRegistration);

// Participants API
app.post("/api/participants", verifyGoogleJwt, ensureAdmin, participantsApi.add);
app.post("/api/participants/:participantId/checkin/:eventId", verifyGoogleJwt, ensureAdmin, participantsApi.checkIn);
app.get("/api/participants/statistics", verifyGoogleJwt, ensureAdmin, participantsApi.getStatistics);

// Start express server
var port: number = process.env.port || 1337;
addDataContext(config.MONGO_URL, app, () => {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
});