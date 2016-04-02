/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';
import StoreBase from './store-base';

class ParticipantStore extends StoreBase<model.IParticipant> implements contracts.IParticipantStore {
    constructor(participants: mongodb.Collection) { 
        super(participants);
    }

    public add(participant: model.IParticipant): Promise<model.IParticipant> {
        return super.add(participant, model.isValidParticipant, e => {});
    }

    public async isAdmin(googleSubject: string): Promise<boolean> {
        let result = await this.collection.find({
            googleSubject: googleSubject,
            roles: { isAdmin: true }
        }).limit(1).toArray();
        return result.length > 0;
    }
    
    public async getAllSummary() : Promise<model.IParticipantSummary> {
        return await this.collection.find({}).project({ givenName: true, familyName: true, email: true}).toArray();
    }
}

export default ParticipantStore;