import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import * as devToken from "./middleware/dev-token";
import * as verifyJwt from "./middleware/verify-jwt";

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

// Start express server
var port: number = process.env.port || 1337;
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});