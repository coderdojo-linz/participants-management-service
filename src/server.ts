import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as devToken from "./middleware/dev-token";
import * as verifyJwt from "./middleware/verify-jwt";
import * as dbSetup from "./modules/db-setup";
import * as config from "./config";
import { Events } from "./modules/events";
import * as utils from "./middleware/utils";
import { Model } from "./model";

// Create express server
var app = express();
app.use(cors());
var bodyParserOptions = { reviver: utils.Middleware.reviver };
app.use(bodyParser.json(bodyParserOptions));
app.use(devToken.google);  // Login page for dev-purposes at /auth/devToken

// Create simple API that can be used for testing
app.get("/hello", (req, res) =>
    res.send({ greeting: "Hello World!" }));

// Return email of user from JWT
app.get("/me", verifyJwt.google, (req, res) =>
    res.send({ email: req.user.email }));

// Endpoint for creating the first user. Will return an error if there is
// already an admin defined in the database.
app.get("/admin/db-setup", verifyJwt.google, async (req, res) => {
    try {
        await dbSetup.setupNewDatabase(config.MONGO_URL, {
            givenName: req.user.given_name,
            familyName: req.user.family_name,
            email: req.user.email,
            googleSubject: req.user.sub
        });
        res.status(200).end();
    } catch (err) {
        res.status(500).send({ error: err });
    }
});

// Events API
app.get("/api/events", async (req, res) => {
    try {
        var includePastEvents = req.query.past && req.query.past === "true";
        
        // Query db
        var store : Events.IEventStore = new Events.EventStore(config.MONGO_URL);
        var result = await store.getAll(includePastEvents);
        
        // Build result
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
});

app.get("/api/events/:_id", async (req, res) => {
    try {
        // Query db
        var store : Events.IEventStore = new Events.EventStore(config.MONGO_URL);
        var result = await store.getById(req.params._id);
        
        // Build result
        if (result) {
            res.status(200).send(result);
        } else {
            // Not found
            res.status(404).end();
        }
    } catch (err) {
        res.status(500).send({ error: err });
    }
});

app.post("/api/events", verifyJwt.google, async (req, res) => {
    try {
        // Check validity of passed event
        let event : Model.Event.IEvent = req.body;
        let isValid = Model.Event.isValid(event, true);
        if (!isValid[0]) {
            // Bad request
            res.status(400).send(isValid[1]);
        }
        
        // Add row to db
        var store : Events.IEventStore = new Events.EventStore(config.MONGO_URL);
        var result = await store.add(req.body);
        
        // Build result
        res.setHeader("Location", `/api/events/${result._id}`);
        res.status(201).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
});

// Start express server
var port: number = process.env.port || 1337;
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
