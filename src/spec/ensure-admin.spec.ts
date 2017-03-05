import ensureAdmin from "../middleware/ensure-admin";
import * as express from "express";
import * as config from './config';
import * as http from "http";
import * as request from 'request';

function httpGet(url: string): Promise<request.RequestResponse> {
    return new Promise<request.RequestResponse>((resolve, _) =>
        request.get(url, (__, response, ___) => resolve(response)));
}

describe("Ensure admin", () => {
    let app: express.Express;
    let server: http.Server;
    const testUrl = `http://localhost:${config.TEST_SERVER_PORT}`;
    beforeAll(done => {
        app = express();
        (<any>app).dc = {
            participants: { isAdmin: function (subject: string) { return subject === "123admin"; } }
        };
        app.get("/no-user", ensureAdmin);
        app.get("/no-roles", (req, _, next) => { req.user = {}; next(); }, ensureAdmin);
        app.get("/wrong-roles", (req, _, next) => { req.user = { roles: "abc" }; next(); }, ensureAdmin);
        app.get("/no-admin", (req, _, next) => { req.user = { roles: ["mentor"] }; next(); }, ensureAdmin);
        app.get("/admin", (req, _, next) => { req.user = { roles: ["mentor", "admin"] }; next(); }, ensureAdmin,
            (_, res) => { res.status(200).send(); });
        server = app.listen(config.TEST_SERVER_PORT, () => done());
    });

    afterAll(done => {
        server.close(() => done());
    });

    it("returns 401 if no user is set", async (done) => {
        const res = await httpGet(`${testUrl}/no-user`);
        expect(res.statusCode).toBe(401);
        done();
    });

    it("returns 400 if no roles are not set", async (done) => {
        let res = await httpGet(`${testUrl}/no-roles`);
        expect(res.statusCode).toBe(400);
        res = await httpGet(`${testUrl}/wrong-roles`);
        expect(res.statusCode).toBe(400);
        done();
    });

    it("returns 403 if user is no admin", async (done) => {
        const res = await httpGet(`${testUrl}/no-admin`);
        expect(res.statusCode).toBe(403);
        done();
    });

    it("succeeds if user is admin", async (done) => {
        const res = await httpGet(`${testUrl}/admin`);
        expect(res.statusCode).toBe(200);
        done();
    });
});