/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';

class EventStore implements contracts.IEventStore {
    constructor(private events: mongodb.Collection) { }

    public async getAll(includePastEvents: boolean): Promise<model.IEvent[]> {
        if (includePastEvents) {
            return await this.events.find({}).toArray();
        } else {
            let now = new Date();
            let result = await this.events.find({
                date: { $gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) }
            }).toArray();

            return result;
        }
    }

    public async getById(_id: string): Promise<model.IEvent> {
        let result = await this.events.find({ _id: new mongodb.ObjectID(_id) }).limit(1).toArray();
        return (result.length !== 0) ? result[0] : null;
    }

    public async add(event: model.IEvent): Promise<model.IEvent> {
        // Check validity of event
        let validationResult = model.isValidEvent(event, true);
        if (!validationResult.isValid) {
            throw validationResult.errorMessage;
        }

        // Ignore time part of event date
        event.date = new Date(Date.UTC(event.date.getUTCFullYear(), event.date.getUTCMonth(), event.date.getUTCDate()));

        await this.events.insertOne(event);
        return event;
    }
}

export default EventStore;