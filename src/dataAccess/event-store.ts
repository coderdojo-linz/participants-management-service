/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';
import StoreBase from './store-base';

class EventStore extends StoreBase<model.IEvent> implements contracts.IEventStore {
    constructor(events: mongodb.Collection) { 
        super(events);
    }

    public async getAll(includePastEvents: boolean): Promise<model.IEvent[]> {
        if (includePastEvents) {
            return await this.collection.find({}).toArray();
        } else {
            let now = new Date();
            let result = await this.collection.find({
                date: { $gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) }
            }).toArray();

            return result;
        }
    }

    public add(event: model.IEvent): Promise<model.IEvent> {
        return super.add(event, model.isValidEvent, e =>
            // Ignore time part of event date
            event.date = new Date(Date.UTC(event.date.getUTCFullYear(), event.date.getUTCMonth(), event.date.getUTCDate())));
    }
}

export default EventStore;