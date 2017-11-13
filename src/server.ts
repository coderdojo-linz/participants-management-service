import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import ensureAdmin from './middleware/ensure-admin';
import eventbriteSync from "./middleware/eventbrite-sync";
import * as config from "./config";
import reviver from "./middleware/reviver";
import addDataContext from "./middleware/add-data-context";
import * as eventApi from "./middleware/events-api";
import * as participantsApi from "./middleware/participants-api";
import setupDb from "./middleware/db-setup-api";
import * as appinsights from "applicationinsights";
import * as jwt from "express-jwt";
import apiKeyAuth from "./middleware/key-auth";

appinsights.setup(config.APP_INSIGHTS_KEY).start();

var app = express();
const jwtCheck = jwt({ secret: config.AUTH0_SECRET, audience: config.AUTH0_CLIENT });
const jwtOptionalCheck = jwt({ secret: config.AUTH0_SECRET, audience: config.AUTH0_CLIENT, credentialsRequired: false });

// Create express server
app.use(cors());
var bodyParserOptions = { reviver: reviver };
app.use(bodyParser.json(bodyParserOptions));

// Endpoint for initializing the DB. Will return an error if DB already initialized
app.get("/admin/db-setup", jwtCheck, setupDb);

// Endpoint for triggering Eventbrite sync
app.post("/admin/eventbrite-sync", jwtCheck, ensureAdmin, eventbriteSync);

// Events API
app.get("/api/events", eventApi.getAll);
app.get("/api/events/:_id", eventApi.getById);
app.post("/api/events", jwtCheck, ensureAdmin, eventApi.add);
app.get("/api/events/:_id/registrations", jwtCheck, ensureAdmin, eventApi.getRegistrations);
app.post("/api/events/:_id/registrations", jwtOptionalCheck, apiKeyAuth, ensureAdmin, eventApi.addRegistration);

// Participants API
app.post("/api/participants", jwtCheck, ensureAdmin, participantsApi.add);
app.post("/api/participants/:participantId/checkin/:eventId", jwtCheck, ensureAdmin, participantsApi.checkIn);
app.get("/api/participants/statistics", jwtCheck, ensureAdmin, participantsApi.getStatistics);
app.get("/api/participants/statistics/gender", participantsApi.getGenderStatistics);

// Start express server
var port: any = process.env.port || 1337;
addDataContext(config.MONGO_URL, app, () => {
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
});