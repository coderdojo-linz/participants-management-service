/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';

export module Events {
    export interface IEvent {
        _id?: string;
        date: Date;
        location: string;
    }

    export interface IEventStore {
        getAll(includePastEvents: boolean): Promise<IEvent[]>;
        getById(_id: string): Promise<IEvent>;
        add(event: IEvent): Promise<IEvent>;
    }

    export class EventStore implements IEventStore {
        constructor(private mongoUrl: string) { }

        private async eventCollection(): Promise<mongodb.Collection> {
            let db = await mongodb.MongoClient.connect(this.mongoUrl);
            return db.collection("events");
        }

        public async getAll(includePastEvents: boolean): Promise<IEvent[]> {
            let events = await this.eventCollection();
            if (includePastEvents) {
                return await events.find({}).toArray();
            } else {
                var now = new Date();
                var result = await events.find({
                    date: { $gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) }
                }).toArray();

                return result;
            }
        }

        public async getById(_id: string): Promise<IEvent> {
            let events = await this.eventCollection();
            var result = await events.find({ _id: new mongodb.ObjectID(_id) }).limit(1).toArray();
            return (result.length !== 0) ? result[0] : null; 
        }

        public async add(event: IEvent): Promise<IEvent> {
            // Check mandatory fields
            if (!event.date || !(event.date instanceof Date)) {
                throw "Missing or invalid member 'date'.";
            }

            if (!event.location || typeof event.location !== "string") {
                throw "Missing or invalid member 'location'.";
            }
            
            let events = await this.eventCollection();
            event.date = new Date(Date.UTC(event.date.getUTCFullYear(), event.date.getUTCMonth(), event.date.getUTCDate())); 
            await events.insertOne(event);
            return event;
        }
    }
}