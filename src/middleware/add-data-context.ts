import * as express from 'express';
import * as mongodb from 'mongodb';

import { MONGO_DB } from '../config';
import ClientStore from '../dataAccess/client-store';
import EventStore from '../dataAccess/event-store';
import Eventbrite from '../dataAccess/eventbrite';
import ParticipantStore from '../dataAccess/participant-store';
import RegistrationStore from '../dataAccess/registration-store';
import SessionStore from '../dataAccess/session-store';

function addDataContext(mongoUrl: string, app: express.Express, cb: () => void) {
    mongodb.MongoClient.connect(mongoUrl, (err, db) => {
        (<any>app).dc = {
            db: db,
            events: new EventStore(db.db(MONGO_DB).collection("events")),
            participants: new ParticipantStore(db.db(MONGO_DB).collection("participants")),
            registrations: new RegistrationStore(db.db(MONGO_DB).collection("registrations")),
            clients: new ClientStore(db.db(MONGO_DB).collection("clients")),
            pickedSessions: new SessionStore(db.db(MONGO_DB).collection("sessions")),
            eventbrite: new Eventbrite()
        };
        cb();
    });
}

export default addDataContext;