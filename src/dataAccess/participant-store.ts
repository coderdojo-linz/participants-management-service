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

    public async getByName(givenName: string, familyName: string): Promise<model.IParticipant> {
        let filter : any = { };
        if (givenName) {
            filter.givenName = givenName;
        }
        
        if (familyName) {
            filter.familyName = familyName;
        }
        
        let result = await this.collection.find(filter).limit(1).toArray();
        return (result.length !== 0) ? result[0] : null;
    }

    public async upsertByName(participant: model.IParticipant): Promise<model.IParticipant> {
        // Note that the following upsert does not set or modify the participant's roles.
        // That's not a bug, it is intended.
        let set : any = { givenName: participant.givenName, familyName: participant.familyName, email: participant.email,
            eventbriteId: participant.eventbriteId };
        if (typeof participant.yearOfBirth !== "undefined") {
            set.yearOfBirth = participant.yearOfBirth;
        }
        
        let upsertResult = await this.collection.findOneAndUpdate(
            { givenName: participant.givenName, familyName: participant.familyName }, 
            { $set: set }, 
            { upsert: true });
        return upsertResult.lastErrorObject.updatedExisting
            ? upsertResult.value
            : await this.getById(upsertResult.lastErrorObject.upserted);
    }
}

export default ParticipantStore;