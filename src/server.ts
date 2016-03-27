import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as devToken from "./middleware/dev-token";
import * as verifyJwt from "./middleware/verify-jwt";
import * as dbSetup from "./modules/db-setup";
import * as config from "./config";
import { Events } from "./modules/events";

// Create express server
var app = express();
app.use(cors());
app.use(bodyParser.json());
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
            email: req.user.email
        });
        res.status(200).end();
    } catch (err) {
        res.status(500).send({ error: err });
    }
});

// Events API
app.get("/api/events", async (req, res) => {
    try {
        var store = new Events.EventStore(config.MONGO_URL);
        var result = store.get(req.param("past", false) === "true");
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
});

app.post("/api/events", async (req, res) => {
    try {
        if (!req.body.date) { 
            res.status(400).send("Missing parameter 'date'.");
            return;
        }

        if (!req.body.location) { 
            res.status(400).send("Missing parameter 'location'.");
            return;
        }
        
        var store = new Events.EventStore(config.MONGO_URL);
        req.body.date = new Date(Date.parse(req.body.date));
        var result = await store.add(req.body);
        res.status(201).send(result).setHeader("Location", `/api/events/${result._id}`);
    } catch (err) {
        res.status(500).send({ error: err });
    }
});

// Start express server
var port: number = process.env.port || 1337;
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
