/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import { Model } from '../model';

export module Events {
    export interface IEventStore {
        getAll(includePastEvents: boolean): Promise<Model.Event.IEvent[]>;
        getById(_id: string): Promise<Model.Event.IEvent>;
        add(event: Model.Event.IEvent): Promise<Model.Event.IEvent>;
    }

    export class EventStore implements IEventStore {
        constructor(private mongoUrl: string) { }

        private async eventCollection(): Promise<mongodb.Collection> {
            let db = await mongodb.MongoClient.connect(this.mongoUrl);
            return db.collection("events");
        }

        public async getAll(includePastEvents: boolean): Promise<Model.Event.IEvent[]> {
            let events = await this.eventCollection();
            if (includePastEvents) {
                return await events.find({}).toArray();
            } else {
                let now = new Date();
                let result = await events.find({
                    date: { $gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) }
                }).toArray();

                return result;
            }
        }

        public async getById(_id: string): Promise<Model.Event.IEvent> {
            let events = await this.eventCollection();
            let result = await events.find({ _id: new mongodb.ObjectID(_id) }).limit(1).toArray();
            return (result.length !== 0) ? result[0] : null; 
        }

        public async add(event: Model.Event.IEvent): Promise<Model.Event.IEvent> {
            // Check validity of event
            let isValid = Model.Event.isValid(event, true);
            if (!isValid[0]) {
                throw isValid[1];
            }
            
            // Ignore time part of event date
            event.date = new Date(Date.UTC(event.date.getUTCFullYear(), event.date.getUTCMonth(), event.date.getUTCDate()));
             
            let events = await this.eventCollection();
            await events.insertOne(event);
            return event;
        }
    }
}