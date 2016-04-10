/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as config from './config';
import EventStore from '../dataAccess/event-store';
import ParticipantStore from '../dataAccess/participant-store';
import RegistrationStore from '../dataAccess/registration-store';
import * as model from '../model';
import synchronize from '../dataAccess/eventbrite-sync';
import * as contracts from '../dataAccess/contracts';

// NOTE THAT THIS FILE CONTAINS INTEGRATION TESTS
// The tests need access to a Mongo test DB. They will create/delete collections there.

describe("Eventbrite synchronization", () => {
    var originalTimeout: number;
    var db: mongodb.Db;
    var dc: contracts.IDataContext;
    
    beforeEach(async (done) => {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        
        db = await mongodb.MongoClient.connect(config.MONGO_TEST_URL);
        let collections = await db.listCollections({ name: "events" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("events");
        }
        
        collections = await db.listCollections({ name: "participants" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("participants");
        }
        
        collections = await db.listCollections({ name: "registrations" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("registrations");
        }
        
        dc = {
            db: db,
            events: new EventStore(db.collection("events")),
            participants: new ParticipantStore(db.collection("participants")),
            registrations: new RegistrationStore(db.collection("registrataions")),
            eventbrite: null
        };
        
        done();
    });

    it("can perform simple sync", async (done) => {
        // Setup mock for data source
        dc.eventbrite = {
            getEvents: () => {
                return new Promise<contracts.IEventbriteEvent[]>((resolve, _) => {
                    resolve([
                        { id: "1", date: new Date(Date.UTC(2016, 1, 1)) } 
                    ]);  
                });
            },
            getCoderTicketClass: (_) => new Promise<string>((resolve, _) => { resolve("999"); }),
            getAttendees: (_, __) => {
                return new Promise<contracts.IEventbriteAttendee[]>((resolve, _) => {
                    resolve([
                        { id: "10", givenName: "John", familyName: "Doe", email: "john.doe@dummy.com", attending: true, isCoder: true } 
                    ]);  
                });
            }
        };
        
        await synchronize(dc);
        
        let events = await dc.events.getAll(true);
        expect(events.length).toBe(1);
        expect(events[0].eventbriteId).toBe("1");
        
        let participants : model.IParticipant[] = await dc.participants.collection.find({}).toArray();
        expect(participants.length).toBe(1);
        expect(participants[0].eventbriteId).toBe("10");
        expect(participants[0].roles).toBeUndefined();
        
        let registrations = await dc.registrations.getByEventId(events[0]._id.toHexString());
        expect(registrations.length).toBe(1);
        expect(registrations[0].registered).toBeTruthy();
        expect(registrations[0].participant.familyName).toBe("Doe");

        done();
    });
    
    afterEach(async (done) => {
        await db.close();
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
    });
});