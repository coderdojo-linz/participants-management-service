/// <reference path="../../typings/main.d.ts" />
import * as express from "express";
import * as contracts from "../dataAccess/contracts";
import * as model from "../model";
import getDataContext from "./get-data-context";

export async function getAll(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        var includePastEvents = req.query.past && req.query.past === "true";

        // Query db
        let store = getDataContext(req).events;
        var result = await store.getAll(includePastEvents);

        // Build result
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export async function getById(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        // Query db
        var store = getDataContext(req).events;
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
}

export async function add(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        // Check validity of passed event
        let event: model.IEvent = req.body;
        let validationResult = model.isValidEvent(event, true);
        if (!validationResult.isValid) {
            // Bad request
            res.status(400).send(validationResult.errorMessage);
        }

        // Add row to db
        let store = getDataContext(req).events;
        let result = await store.add(event);

        // Build result
        res.setHeader("Location", `/api/events/${result._id}`);
        res.status(201).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export async function getRegistrations(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        var dc = getDataContext(req);
        var result = await dc.registrations.getByEventId(req.params._id);
        if (!result || result.length == 0) {
            // Not found
            res.status(404).end();
            return;
        }
        
        return res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ error: err });
    }
}