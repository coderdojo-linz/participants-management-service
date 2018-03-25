import * as contracts from '../dataAccess/contracts';
import EventStore from '../dataAccess/event-store';
import ParticipantStore from '../dataAccess/participant-store';
import RegistrationStore from '../dataAccess/registration-store';
import StoreBase from '../dataAccess/store-base';
import * as model from '../model';
import * as config from './config';
import * as mongodb from 'mongodb';
import SessionStore from '../dataAccess/session-store';

// NOTE THAT THIS FILE CONTAINS INTEGRATION TESTS
// The tests need access to a Mongo test DB. They will create/delete collections there.

describe("Get statistics", () => {
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

    it("can generate gener statistics", async (done) => {
        const event1 = { date: new Date(2017, 1, 1), eventbriteId: "1", location: "Wissensturm", quantityTotal: 10, quantitySold: 0 };
        const event2 = { date: new Date(2017, 2, 1), eventbriteId: "1", location: "Wissensturm", quantityTotal: 10, quantitySold: 0 };
        const event3 = { date: new Date(2017, 3, 1), eventbriteId: "1", location: "Wissensturm", quantityTotal: 10, quantitySold: 0 };
        await dc.events.add(event1);
        await dc.events.add(event2);
        await dc.events.add(event3);
        const events = await dc.events.getAll(true);
        const registrationEvent1 = { id: events[0]._id, date: events[0].date };
        const registrationEvent2 = { id: events[1]._id, date: events[1].date };
        const registrationEvent3 = { id: events[2]._id, date: events[2].date };

        await dc.participants.add({ email: "jane@doe.com", eventbriteId: "1", familyName: "Smith", givenName: "Jane", yearOfBirth: "2000", gender: "f" });
        await dc.participants.add({ email: "john@doe.com", eventbriteId: "1", familyName: "Smith", givenName: "John", yearOfBirth: "2001", gender: "m" });
        await dc.participants.add({ email: "foo@bar.com", eventbriteId: "1", familyName: "Bar", givenName: "Foo", yearOfBirth: "2001" });
        const jane = await dc.participants.getByName("Jane", "Smith");
        const registrationJane = { id: jane._id, givenName: jane.givenName, familyName: jane.familyName };
        const john = await dc.participants.getByName("John", "Smith");
        const registrationJohn = { id: john._id, givenName: john.givenName, familyName: john.familyName };
        const fooBar = await dc.participants.getByName("Foo", "Bar");
        const registrationFooBar = { id: fooBar._id, givenName: fooBar.givenName, familyName: fooBar.familyName };

        let registration : model.IRegistration;
        registration = { event: registrationEvent1, participant: registrationJane, registered: true, needsComputer: false };
        await dc.registrations.upsertByEventAndParticipant(registration);
        await dc.registrations.checkIn(events[0], jane);
        registration = { event: registrationEvent1, participant: registrationJohn, registered: true, needsComputer: false };
        await dc.registrations.upsertByEventAndParticipant(registration);
        registration = { event: registrationEvent1, participant: registrationFooBar, registered: true, needsComputer: false };
        await dc.registrations.upsertByEventAndParticipant(registration);

        registration = { event: registrationEvent2, participant: registrationJane, registered: true, needsComputer: false };
        await dc.registrations.upsertByEventAndParticipant(registration);

        registration = { event: registrationEvent3, participant: registrationJohn, registered: true, needsComputer: false };
        await dc.registrations.upsertByEventAndParticipant(registration);

        const stats = await dc.registrations.getGenderStatistics();
        expect(stats.length).toBe(5);
        for(let statsRow of stats) {
            if (statsRow.eventId.equals(registrationEvent1.id)) {
                switch (statsRow.gender)
                {
                    case 'm':
                        expect(statsRow.registered).toBe(1);
                        expect(statsRow.checkedin).toBe(0);
                        break;
                    case 'f':
                        expect(statsRow.registered).toBe(1);
                        expect(statsRow.checkedin).toBe(1);
                        break;
                    case 'u':
                        expect(statsRow.registered).toBe(1);
                        expect(statsRow.checkedin).toBe(0);
                        break;
                    default:
                        fail();
                }
            } else if (statsRow.eventId.equals(registrationEvent2.id)) {
                expect(statsRow.gender).toBe("f");
                expect(statsRow.registered).toBe(1);
            } else if (statsRow.eventId.equals(registrationEvent3.id)) {
                expect(statsRow.gender).toBe("m");
                expect(statsRow.registered).toBe(1);
            } else {
                fail();
            }
        }

        done();
    });
    
    afterEach(async (done) => {
        await client.close();
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
    });
});