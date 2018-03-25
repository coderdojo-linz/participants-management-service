import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';
import StoreBase from './store-base';

class SessionStore extends StoreBase<model.IPickedSession> implements contracts.IPickedSessionStore {
    constructor(sessions: mongodb.Collection) {
        super(sessions);
    }

    public async getForEvent(eventId: string): Promise<model.IPickedSession[]> {
        return await this.collection.find<model.IPickedSession>({eventId: eventId}).sort({ "sessionId": 1, "userId": 1 }).toArray();
    }

    public add(session: model.IPickedSession): Promise<model.IPickedSession> {
        return super.add(session, model.isValidPickedSession, e => {});
    }

    public async getForUser(eventId: string, userId: string): Promise<model.IPickedSession[]> {
        return await this.collection.find<model.IPickedSession>({eventId: eventId, userId: userId}).sort({ "sessionId": 1 }).toArray();
    }

    public async delete(_id: string): Promise<any> {
        await this.collection.deleteOne({ _id: new mongodb.ObjectID(_id) });
    }
}

export default SessionStore;