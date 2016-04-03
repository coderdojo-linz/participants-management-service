/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as config from './config';
import setupNewDatabase from '../dataAccess/db-setup';
import EventStore from '../dataAccess/event-store';
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

    afterEach(async (done) => {
        await db.close();
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        done();
    });
});