import * as mongodb from 'mongodb';
import * as config from './config';
import EventStore from '../dataAccess/event-store';
import ParticipantStore from '../dataAccess/participant-store';
import RegistrationStore from '../dataAccess/registration-store';
import * as model from '../model';
import synchronize from '../dataAccess/eventbrite-sync';
import * as contracts from '../dataAccess/contracts';
import SessionStore from '../dataAccess/session-store';

// NOTE THAT THIS FILE CONTAINS INTEGRATION TESTS
// The tests need access to a Mongo test DB. They will create/delete collections there.

function fromResult<T>(item: T): Promise<T> {
    return new Promise<T>((resolve, _) => {
        resolve(item);
    });
}

function generateMockEventbrite(events: contracts.IEventbriteEvent[], attendees: contracts.IEventbriteAttendee[]): contracts.IEventbrite {
    return {
        getEvents: () => fromResult(events),
        getCoderTicketClasses: (_) => fromResult(["998", "999"]),
        getAttendees: (_: string, coderTicketClasses: string[]) => {
            if (coderTicketClasses.length !== 2 || coderTicketClasses[0] !== "998" || coderTicketClasses[1] !== "999") {
                throw "Invalid ticket classes";
            }

            return fromResult(attendees);
        },
        getTicketClassStatuses: (_: string[]) => fromResult(events.map(e => { return { eventId: e.id, quantitySold: 99, quantityTotal: 99 } }))
    };
}

describe("Eventbrite synchronization", () => {
    var originalTimeout: number;
    var client: mongodb.MongoClient;
    var db: mongodb.Db;
    var dc: contracts.IDataContext;

    beforeEach(async (done) => {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

        client = await mongodb.MongoClient.connect(config.MONGO_TEST_URL);
        db = client.db(config.MONGO_TEST_DB);
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
            pickedSessions: new SessionStore(db.collection("sessions")),
            clients: null,
            eventbrite: null
        };

        done();
    });

    it("can perform simple sync", async (done) => {
        // Setup mock for data source
        dc.eventbrite = generateMockEventbrite(
            [{ id: "1", date: new Date(Date.UTC(2016, 1, 1)) }],
            [{
                id: "10", givenName: "John", familyName: "Doe", email: "john.doe@dummy.com",
                attending: true, needsComputer: true, yearOfBirth: "1990"
            },
            {
                id: "20", givenName: "JOHN ", familyName: " DOE", email: "jdoe@dummy.com",
                attending: true, needsComputer: false, yearOfBirth: "1990"
            },
            {
                id: "30", givenName: "jANE ", familyName: " Smith", email: " jane.smith@dummy.com ",
                attending: true, needsComputer: false, yearOfBirth: "1990"
            }
            ]);

        // Execute
        await synchronize(dc);

        // Check
        let events = await dc.events.getAll(true);
        expect(events.length).toBe(1);
        expect(events[0].eventbriteId).toBe("1");

        let participants: model.IParticipant[] = await dc.participants.collection.find({}).toArray();
        expect(participants.length).toBe(2);
        expect(participants[0].eventbriteId).toBe("20");
        expect(participants[0].roles).toBeUndefined();
        expect(participants[0].yearOfBirth).toBe("1990");
        expect(participants[0].givenName).toBe("John");
        expect(participants[0].familyName).toBe("Doe");
        expect(participants[0].email).toBe("jdoe@dummy.com");

        let registrations: model.IRegistration[] = await dc.registrations.collection.find({}).toArray();
        expect(registrations.length).toBe(2);
        expect(registrations[0].registered).toBeTruthy();
        expect(registrations[0].participant.givenName).toBe("John");
        expect(registrations[0].participant.familyName).toBe("Doe");
        expect(registrations[0].needsComputer).toBeFalsy();
        expect(registrations[1].registered).toBeTruthy();
        expect(registrations[1].participant.givenName).toBe("Jane");
        expect(registrations[1].participant.familyName).toBe("Smith");
        expect(registrations[1].needsComputer).toBeFalsy();

        done();
    });

    it("can update registered state", async (done) => {
        // Prepare database by inserting one event and one registration
        let newEvent: model.IEvent = {
            _id: new mongodb.ObjectID(), date: new Date(Date.UTC(2016, 1, 1)),
            location: "Wissensturm", eventbriteId: "1"
        };
        await dc.events.add(newEvent);

        let newParticipant: model.IParticipant = {
            _id: new mongodb.ObjectID(), givenName: "John",
            familyName: "Doe", email: "john.doe@dummy.com", googleSubject: "dummy", yearOfBirth: "1990"
        };
        await dc.participants.add(newParticipant)
        let newReg: model.IRegistration = {
            _id: new mongodb.ObjectID(),
            event: { id: newEvent._id, date: new Date(Date.UTC(2016, 1, 1)) },
            participant: { id: newParticipant._id, givenName: newParticipant.givenName, familyName: newParticipant.familyName },
            checkedin: true
        }
        await dc.registrations.collection.insertOne(newReg);

        // Setup mock for data source
        dc.eventbrite = generateMockEventbrite(
            [{ id: newEvent.eventbriteId, date: newEvent.date }],
            [{
                id: newParticipant.eventbriteId, givenName: newParticipant.givenName,
                familyName: newParticipant.familyName, email: "j.doe@dummy.com", attending: true,
                needsComputer: true
            }]);

        // Execute
        await synchronize(dc);

        // Check
        let events = await dc.events.getAll(true);
        expect(events.length).toBe(1);

        let participants: model.IParticipant[] = await dc.participants.collection.find({}).toArray();
        expect(participants.length).toBe(1);
        expect(participants[0].email).toBe("j.doe@dummy.com");  // Must have been updated
        expect(participants[0].yearOfBirth).toBe("1990");       // Must be unchanged

        let registrations: model.IRegistration[] = await dc.registrations.collection.find({}).toArray();
        expect(registrations.length).toBe(1);
        expect(registrations[0].registered).toBeTruthy();       // Must have been set
        expect(registrations[0].checkedin).toBeTruthy();        // Must be unchanged
        expect(registrations[0].needsComputer).toBeTruthy();    // Must have been set

        done();
    });

    afterEach(async (done) => {
        await client.close();
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
    });
});