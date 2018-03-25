import * as mongodb from 'mongodb';
import * as config from './config';
import setupNewDatabase from '../dataAccess/db-setup';
import EventStore from '../dataAccess/event-store';
import ParticipantStore from '../dataAccess/participant-store';
import RegistrationStore from '../dataAccess/registration-store';
import StoreBase from '../dataAccess/store-base';
import * as model from '../model';
import SessionStore from '../dataAccess/session-store';

// NOTE THAT THIS FILE CONTAINS INTEGRATION TESTS
// The tests need access to a Mongo test DB. They will create/delete collections there.

class EscapeMock extends StoreBase<model.IParticipant> {
    public tryEscape(s: string) : string {
        return this.escapeRegexString(s);
    }

    public tryFixCasing(s: string) : string {
        return this.fixCasing(s);
    }
}

describe("Data access", () => {
    var originalTimeout: number;
    var client: mongodb.MongoClient;
    var db: mongodb.Db;

    beforeEach(async (done) => {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        
        client = await mongodb.MongoClient.connect(config.MONGO_TEST_URL);
        db = client.db(config.MONGO_TEST_DB);
        done();
    });

    it("escapes strings for regex correctly", () => {
        var escaper = new EscapeMock(null);

        expect(escaper.tryEscape("^test.[Aa]+test$")).toBe("\\^test\\.\\[Aa\\]\\+test\\$");
    });

    it("fixes casing correctly", () => {
        var fixer = new EscapeMock(null);

        expect(fixer.tryFixCasing("jOHN")).toBe("John");
    });

    it("can setup empty database", async (done) => {
        // Delete participants collection if it already exists
        let collections = await db.listCollections({ name: "participants" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("participants");
        }

        // Execute method to test
        await setupNewDatabase(config.MONGO_TEST_URL, config.MONGO_TEST_DB, { email: "d@trash-mail.com", givenName: "John",
            familyName: "Doe", googleSubject: "dummySubject" });

        // Participant collection has to exist and there has to be one admin in the participants collection
        let participants = db.collection("participants");
        let users = await participants.find({}).toArray();
        expect(users.length).toBe(1);
        expect(users[0].roles.isAdmin).toBeTruthy();

        done();
    });

    it("can maintain events", async (done) => {
        // Delete events collection if it already exists
        let collections = await db.listCollections({ name: "events" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("events");
        }

        let eventCollection = db.collection("events");
        let eventStore = new EventStore(eventCollection);
        
        // Create two events (one in the future, one in the past)
        let newEventFuture : model.IEvent = await eventStore.add({ date: new Date(Date.UTC(2030, 1, 31)), location: "Anywhere" });
        expect(model.isValidEvent(newEventFuture, false).isValid).toBeTruthy();
        let newEventPast : model.IEvent = await eventStore.add({ date: new Date(Date.UTC(1990, 1, 31)), location: "Anywhere" });
        expect(model.isValidEvent(newEventPast, false).isValid).toBeTruthy();

        // Get event using ID
        expect(await eventStore.getById(newEventFuture._id.toHexString())).not.toBeNull();
        
        // Get all events (without/with past events)
        let events = await eventStore.getAll(false);
        expect(events.length).toBe(1);
        events = await eventStore.getAll(true);
        expect(events.length).toBe(2);

        done();
    });

    it("can maintain participants", async (done) => {
        // Delete participants collection if it already exists
        let collections = await db.listCollections({ name: "participants" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("participants");
        }

        let participantCollection = db.collection("participants");
        let participantStore = new ParticipantStore(participantCollection);
        
        // Create participants. Note that second participant has blanks in its name
        let participant1 : model.IParticipant = await participantStore.add({ givenName: "John", familyName: "Doe" });
        expect(model.isValidParticipant(participant1, false).isValid).toBeTruthy();
        let participant2 : model.IParticipant = await participantStore.add({ givenName: "Jane ", familyName: " Smith" });
        expect(model.isValidParticipant(participant2, false).isValid).toBeTruthy();

        // Get participant using ID
        var checkedInParticipant : any = await participantStore.getById(participant1._id.toHexString());
        expect(checkedInParticipant).not.toBeNull();
        checkedInParticipant = await participantStore.getById(participant2._id.toHexString());
        expect(checkedInParticipant).not.toBeNull();
        expect(checkedInParticipant.givenName).toBe("Jane");
        expect(checkedInParticipant.familyName).toBe("Smith");

        done();
    });

    it("can maintain registrations", async (done) => {
        // Delete registrations collection if it already exists
        let collections = await db.listCollections({ name: "registrations" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("registrations");
        }

        let registrationCollection = db.collection("registrations");
        let registrationStore = new RegistrationStore(registrationCollection);
        
        // Create a new registration
        var dummyEvent : model.IEvent = { _id: new mongodb.ObjectID(), date: new Date(), location: "" };
        var dummyParticipant : model.IParticipant = { _id: new mongodb.ObjectID(), givenName: "", familyName: "" };
        expect(await registrationStore.checkIn(dummyEvent, dummyParticipant)).toBeTruthy();
        expect(await registrationStore.checkIn(dummyEvent, dummyParticipant)).toBeFalsy();
        expect(await registrationStore.getNumberOfCheckins(dummyParticipant._id)).toBe(1);
        expect(await registrationStore.getNumberOfCheckins(new mongodb.ObjectID())).toBe(0);

        done();
    });

    it("can maintain sessions", async (done) => {
        // Delete sessions collection if it already exists
        let collections = await db.listCollections({ name: "sessions" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("sessions");
        }

        let sessionCollection = db.collection("sessions");
        let sessionStore = new SessionStore(sessionCollection);
        
        // Create session
        let newSession : model.IPickedSession = await sessionStore.add({ eventId: "eid", sessionId: "sid", userId: "uid" });
        expect(model.isValidPickedSession(newSession, false).isValid).toBeTruthy();

        // Check ignoring duplicates
        newSession = await sessionStore.add({ eventId: "eid", sessionId: "sid", userId: "uid" });
        expect(model.isValidPickedSession(newSession, false).isValid).toBeTruthy();

        // Get session using ID
        expect(await sessionStore.getById(newSession._id.toHexString())).not.toBeNull();
        
        // Get all sessions
        let events = await sessionStore.getForEvent("eid");
        expect(events.length).toBe(1);
        events = await sessionStore.getForUser("eid", "uid");
        expect(events.length).toBe(1);

        // Delete session
        await sessionStore.delete(newSession._id.toHexString());
        events = await sessionStore.getForEvent("eid");
        expect(events.length).toBe(0);

        done();
    });

    afterEach(async (done) => {
        await client.close();
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
    });
});