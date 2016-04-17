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

function fromResult<T>(item: T) : Promise<T> { 
    return new Promise<T>((resolve, _) => {
       resolve(item); 
    });
 }
 
 function generateMockEventbrite(events: contracts.IEventbriteEvent[], attendees: contracts.IEventbriteAttendee[]) : contracts.IEventbrite {
     return {
        getEvents: () => fromResult(events),
        getCoderTicketClass: (_) => fromResult("999"),
        getAttendees: () => fromResult(attendees)    
     };
 }

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
            registrations: new RegistrationStore(db.collection("registrations")),
            eventbrite: null
        };
        
        done();
    });

    it("can perform simple sync", async (done) => {
        // Setup mock for data source
        dc.eventbrite = generateMockEventbrite(
            [ { id: "1", date: new Date(Date.UTC(2016, 1, 1)) } ],  
            [ { id: "10", givenName: "John", familyName: "Doe", email: "john.doe@dummy.com", attending: true, isCoder: true } ]);
        
        // Execute
        await synchronize(dc);
        
        // Check
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

    it("can update registered state", async (done) => {
        // Prepare database by inserting one event and one registration
        let newEvent : model.IEvent = { _id: new mongodb.ObjectID(), date: new Date(Date.UTC(2016, 1, 1)),
            location: "Wissensturm", eventbriteId: "1" };
        dc.events.add(newEvent);
        let newParticipant : model.IParticipant = { _id: new mongodb.ObjectID(), givenName: "John",
            familyName: "Doe", email: "john.doe@dummy.com", googleSubject: "dummy" };
        dc.participants.add(newParticipant)
        let newReg : model.IRegistration = { _id: new mongodb.ObjectID(),
            event: { id: newEvent._id, date: new Date(Date.UTC(2016, 1, 1)) },
            participant: { id: newParticipant._id, givenName: newParticipant.givenName, familyName: newParticipant.familyName },
            checkedin: true
        }
        dc.registrations.collection.insertOne(newReg);
        
        // Setup mock for data source
        dc.eventbrite = generateMockEventbrite(
            [ { id: newEvent.eventbriteId, date: newEvent.date } ],  
            [ { id: newParticipant.eventbriteId, givenName: newParticipant.givenName, 
                familyName: newParticipant.familyName, email: "j.doe@dummy.com", attending: true, isCoder: true } ]);
        
        // Execute
        await synchronize(dc);
        
        // Check
        let events = await dc.events.getAll(true);
        expect(events.length).toBe(1);
        
        let participants : model.IParticipant[] = await dc.participants.collection.find({}).toArray();
        expect(participants.length).toBe(1);
        expect(participants[0].email).toBe("j.doe@dummy.com");
        
        let registrations = await dc.registrations.collection.find({}).toArray();
        expect(registrations.length).toBe(1);
        expect(registrations[0].registered).toBeTruthy();
        expect(registrations[0].checkedin).toBeTruthy();

        done();
    });
        
    afterEach(async (done) => {
        await db.close();
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
    });
});