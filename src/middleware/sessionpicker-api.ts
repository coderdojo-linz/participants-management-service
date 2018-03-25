import { IEventbriteEventStatus } from '../dataAccess/contracts';
import * as express from "express";
import * as contracts from "../dataAccess/contracts";
import * as model from "../model";
import getDataContext from "./get-data-context";
import * as Eventbrite from "../dataAccess/eventbrite";
import * as config from '../config';

export async function add(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        // Check validity of passed event
        let pickedSession: model.IPickedSession = req.body;
        let validationResult = model.isValidPickedSession(pickedSession, true);
        if (!validationResult.isValid) {
            // Bad request
            res.status(400).send(validationResult.errorMessage);
            return;
        }

        if (req.params.eventId !== pickedSession.eventId) {
            // Bad request
            res.status(400).send("Event IDs in URL and body do not match");
            return;
        }

        // Add row to db
        let store = getDataContext(req).pickedSessions;
        let result = await store.add(pickedSession);

        // Build result
        res.setHeader("Location", `/api/sessions/${result._id}`);
        res.status(201).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export async function getById(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        // Query db
        let store = getDataContext(req).pickedSessions;
        let result = await store.getById(req.params._id);

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
}

export async function deleteById(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        // Query db
        let store = getDataContext(req).pickedSessions;
        let result = await store.getById(req.params._id);

        // Build result
        if (result) {
            await store.delete(req.params._id);
            res.status(204).end();
        } else {
            // Not found
            res.status(404).end();
        }
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export async function getForEvent(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        const eventId = req.params.eventId;

        // Query db
        const dc = getDataContext(req);
        let result = await dc.pickedSessions.getForEvent(eventId);

        // Build result
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export async function getForUser(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        const eventId = req.params.eventId;
        const userId = req.params.userId;

        // Query db
        const dc = getDataContext(req);
        let result = await dc.pickedSessions.getForUser(eventId, userId);

        // Build result
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
}
