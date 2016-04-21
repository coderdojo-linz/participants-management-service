/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as config from './config';
import setupNewDatabase from '../dataAccess/db-setup';
import EventStore from '../dataAccess/event-store';
import ParticipantStore from '../dataAccess/participant-store';
import RegistrationStore from '../dataAccess/registration-store';
import * as model from '../model';

// NOTE THAT THIS FILE CONTAINS INTEGRATION TESTS
// The tests need access to a Mongo test DB. They will create/delete collections there.

describe("Data access", () => {
    var originalTimeout: number;
    var db: mongodb.Db;

    beforeEach(async (done) => {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        
        db = await mongodb.MongoClient.connect(config.MONGO_TEST_URL);
        done();
    });

    it("can setup empty database", async (done) => {
        // Delete participants collection if it already exists
        let collections = await db.listCollections({ name: "participants" }).toArray();
        if (collections.length > 0) {
            await db.dropCollection("participants");
        }

        // Execute method to test
        await setupNewDatabase(config.MONGO_TEST_URL, { email: "d@trash-mail.com", givenName: "John",
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
        
        // Create a participant
        let participant : model.IParticipant = await participantStore.add({ givenName: "John", familyName: "Doe" });
        expect(model.isValidParticipant(participant, false).isValid).toBeTruthy();

        // Get participant using ID
        var checkedInParticipant : any = await participantStore.getById(participant._id.toHexString());
        expect(checkedInParticipant).not.toBeNull();

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
    
    afterEach(async (done) => {
        await db.close();
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
    });
});