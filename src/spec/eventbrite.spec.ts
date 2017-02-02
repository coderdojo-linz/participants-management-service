import * as mongodb from 'mongodb';
import * as config from './config';
import Eventbrite from '../dataAccess/eventbrite';
import * as model from '../model';
import * as contracts from '../dataAccess/contracts';

// NOTE THAT THIS FILE CONTAINS INTEGRATION TESTS
// The tests need access to a Eventbrite. It will NOT alter data there, just read from it.

// Data of a defined test event. Test cases uses the following constants for expectations.
const testEventId = '26026378599';
const testEventTicketClasses = 2;
const testEventCoderClass = '51446254';
const testEventMasterCoderClass = '54915225';
const testEventAttendees = 52;

describe("Eventbrite", () => {
    let originalTimeout: number;

    beforeEach(() => {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    });

    it("can filter ticket classes", () => {
        let eb : any = new Eventbrite();

        let ebTicketClasses : contracts.IEventbriteTicketClass[] = [
            { id: '997', name: 'Foo Bar' },
            { id: '998', name: 'Coder' },
            { id: '999', name: 'Master Coder' }
        ];

        var filteredTicketClasses : string[] = eb.filterTicketClasses(ebTicketClasses, "Coder|Master Coder".split('|'));
        expect(filteredTicketClasses.length).toBe(2);
        expect(filteredTicketClasses[0]).toBe('998');
        expect(filteredTicketClasses[1]).toBe('999');
    });

    it("can read events", async (done) => {
        let eb = new Eventbrite();
        let events = await eb.getEvents();
        expect(events.length).toBeGreaterThan(0);

        done();
    });

    it("can get attendees", async (done) => {
        let eb = new Eventbrite();

        let ticketClasses = await eb.getCoderTicketClasses(testEventId);
        expect(ticketClasses.length).toBe(testEventTicketClasses);
        expect(ticketClasses).toContain(testEventCoderClass);
        expect(ticketClasses).toContain(testEventMasterCoderClass);

        let attendees = await eb.getAttendees(testEventId, ticketClasses);
        expect(attendees.length).toBe(testEventAttendees);

        done();
    });
    
    it("can read ticket class status", async (done) => {
        let eb = new Eventbrite();
        const statuses = await eb.getTicketClassStatuses([testEventId]);
        expect(statuses).toBeTruthy();
        expect(statuses.length).toBe(1);
        expect(statuses[0].quantityTotal).toBeGreaterThan(0);
        expect(statuses[0].quantitySold).toBeLessThanOrEqual(statuses[0].quantityTotal);

        done();
    });

    
    afterEach(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
});