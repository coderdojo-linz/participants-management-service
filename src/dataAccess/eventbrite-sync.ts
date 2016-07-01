/// <reference path="../../typings/index.d.ts" />
import * as mongodb from 'mongodb';
import * as contracts from './contracts';
import * as model from '../model';

async function synchronize(dc: contracts.IDataContext) : Promise<any> {
    // Get all events from Eventbrite
    let events = await dc.eventbrite.getEvents();
    for (let event of events) {
        // Ignore time part of event date
        event.date = new Date(Date.UTC(event.date.getUTCFullYear(), event.date.getUTCMonth(), event.date.getUTCDate()));
        
        // Upsert event
        let dbEvent = await dc.events.upsertByEventbriteId(
            { date: event.date, location: "Wissensturm Linz", eventbriteId: event.id });
        
        // Get ticket classes and finder ticket class for coders (excludes e.g. parents)
        let coderTicketClass = await dc.eventbrite.getCoderTicketClass(event.id);
        
        // Get attendees from Eventbrite for current event
        let attendees = await dc.eventbrite.getAttendees(event.id, coderTicketClass);
        for (let attendee of attendees) {
            // Upsert participant
            let dbParticipant = await dc.participants.upsertByName({ 
                givenName: attendee.givenName, familyName: attendee.familyName, 
                email: attendee.email, eventbriteId: attendee.id, yearOfBirth: attendee.yearOfBirth });
                        
            // Upsert registration
            let registration : model.IRegistration = { 
                    event: { id: dbEvent._id, date: dbEvent.date }, 
                    participant: { id: dbParticipant._id, givenName: dbParticipant.givenName, familyName: dbParticipant.familyName }, 
                    registered: attendee.attending, needsComputer: attendee.needsComputer
                };
            await dc.registrations.upsertByEventAndParticipant(registration);
        }
    }
}

export default synchronize;