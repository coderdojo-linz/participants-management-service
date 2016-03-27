/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as chalk from 'chalk';
import * as moment from 'moment';

export module Events {
    export interface IEvent {
        _id?: string;
        date: Date;
        location: string;
    }

    export class EventStore {
        constructor(private mongoUrl: string) { }

        private async eventCollection(): Promise<mongodb.Collection> {
            let db = await mongodb.MongoClient.connect(this.mongoUrl);
            return db.collection("events");
        }

        public async get(includePastEvents: boolean): Promise<IEvent[]> {
            let events = await this.eventCollection();
            if (includePastEvents) {
                return await events.find({}).toArray();
            } else {
                var now = new Date();
                var result = await events.find({
                    date: { $ge: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) }
                }).toArray();

                return result/*.map(r => {
                    return {
                        id: r._id.toHexString(),
                        date: r.date,
                        location: r.location
                    }
                })*/;
            }
        }

        public async add(event: IEvent): Promise<IEvent> {
            let events = await this.eventCollection();
            console.log(event);
            var newEvent : IEvent = {
                date: new Date(Date.UTC(event.date.getUTCFullYear(), event.date.getUTCMonth(), event.date.getUTCDate())),
                location: event.location
            };
            console.log(newEvent);
            await events.insertOne(newEvent);
            return newEvent;
        }
    }
}