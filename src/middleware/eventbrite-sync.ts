/// <reference path="../../typings/main.d.ts" />
import * as express from "express";
import * as config from "../config";
import * as needle from "needle";
import getDataContext from "./get-data-context";
import * as mongodb from 'mongodb';
import * as model from "../model";

let headers = { headers: { "Authorization": `Bearer ${config.EVENTBRITE_TOKEN}` } };

function fetchEventbriteEvents() : Promise<any> {
    return new Promise<any>((resolve, reject) => {
        needle.get(`https://www.eventbriteapi.com/v3/series/${config.EVENTBRITE_SERIES_ID}/events/?time_filter=current_future`, 
            headers, (err, res) => {
            if (!err && res.statusCode == 200) {
                resolve(res.body.events.map((e : any) => { return { id: e.id, date: new Date(e.start.utc) } }));
            } else {
                reject();
            }
        });
    });
}

interface IAttendeesResult {
    pageNumber: number;
    pageCount: number;
    result: any[];
}

function fetchEventbriteAttendees(eventId: string, page: number, ticketClass: string) : Promise<IAttendeesResult> {
    return new Promise<any>((resolve, reject) => {
        page = page || 1;
        needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/attendees/?page=${page}`, 
            headers, (err, res) => {
            if (!err && res.statusCode == 200) {
                resolve({
                    pageNumber: res.body.pagination.page_number,
                    pageCount: res.body.pagination.page_count,
                    result: res.body.attendees.map((e : any) => { return { 
                        id: e.id,
                        givenName: e.profile.first_name,
                        familyName: e.profile.last_name,
                        email: e.profile.email,
                        attending: e.status === "Attending",
                        isCoder: e.ticket_class_id === ticketClass
                    } }).filter((e: any) => e.isCoder)
                });
            } else {
                reject(err);
            }
        });
    });
}

function fetchEventbriteTicketClasses(eventId: string) : Promise<any[]> {
    return new Promise<any>((resolve, reject) => {
        needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/ticket_classes/`, 
            headers, (err, res) => {
            if (!err && res.statusCode == 200) {
                resolve(res.body.ticket_classes.map((e : any) => { return { id: e.id, name: e.name }; }));
            } else {
                reject(err);
            }
        });
    });
}

function getNewId(result: mongodb.FindAndModifyWriteOpResultObject) : mongodb.ObjectID {
    return result.lastErrorObject.updatedExisting ? result.value._id : result.lastErrorObject.upserted;
}

async function eventbriteSync(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        let dc = getDataContext(req);
        
        // Get all events from Eventbrite
        let events = await fetchEventbriteEvents();
        for (let event of events) {
            // Ignore time part of event date
            event.date = new Date(Date.UTC(event.date.getUTCFullYear(), event.date.getUTCMonth(), event.date.getUTCDate()));
            
            // Upsert event
            let eventResult = await dc.events.collection.findOneAndUpdate(
                { eventbriteId: event.id }, 
                { $set: { date: event.date, location: "Wissensturm Linz", eventbriteId: event.id } }, 
                { upsert: true });
            let dbEvent : model.IEvent = eventResult.lastErrorObject.updatedExisting
                ? eventResult.value
                : await dc.events.getById(eventResult.lastErrorObject.upserted);
            
            // Get ticket classes
            let ticketClasses = await fetchEventbriteTicketClasses(event.id);
            let coderTicketClass = ticketClasses.filter(tc => tc.name === "Coder")[0].id;
            
            // Get attendees from Eventbrite
            let attendees : any[] = [];
            let ebResult: IAttendeesResult;
            let page = 0;
            do {
                ebResult = await fetchEventbriteAttendees(event.id, ++page, coderTicketClass);
                attendees = attendees.concat(ebResult.result);
            } while (page < ebResult.pageCount);
            for (let attendee of attendees) {
                // Upsert participant
                var participantResult = await dc.participants.collection.findOneAndUpdate(
                    { givenName: attendee.givenName, familyName: attendee.familyName }, 
                    { $set: { givenName: attendee.givenName, familyName: attendee.familyName, email: attendee.email,
                        eventbriteId: attendee.id } }, 
                    { upsert: true });
                let dbParticipant : model.IParticipant = participantResult.lastErrorObject.updatedExisting
                    ? participantResult.value
                    : await dc.participants.getById(participantResult.lastErrorObject.upserted);
                               
                // Upsert registration
                await dc.registrations.collection.updateOne(
                    { "event.id": dbEvent._id, "participant.id": dbParticipant._id },
                    { $set: { event: { id: dbEvent._id, date: dbEvent.date }, 
                        participant: { id: dbParticipant._id, givenName: dbParticipant.givenName, familyName: dbParticipant.familyName }, 
                        registered: attendee.attending 
                    } },
                    { upsert: true });
            }
        }
        
        res.status(201).end();
    } catch (err) {
        res.status(500).send({ error: err });
    }
}

export default eventbriteSync;