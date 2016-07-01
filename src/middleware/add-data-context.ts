/// <reference path="../../typings/index.d.ts" />
import * as express from "express";
import * as mongodb from 'mongodb';
import EventStore from '../dataAccess/event-store';
import ParticipantStore from '../dataAccess/participant-store';
import RegistrationStore from '../dataAccess/registration-store';
import Eventbrite from '../dataAccess/eventbrite';

function addDataContext(mongoUrl: string, app: express.Express, cb: () => void) {
    mongodb.MongoClient.connect(mongoUrl, (err, db) => {
        (<any>app).dc = {
            db: db,
            events: new EventStore(db.collection("events")),
            participants: new ParticipantStore(db.collection("participants")),
            registrations: new RegistrationStore(db.collection("registrations")),
            eventbrite: new Eventbrite()                    
        };
        cb();
    });
}

export default addDataContext;