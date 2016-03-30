/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';

class ParticipantStore implements contracts.IParticipantStore {
    constructor(private participants: mongodb.Collection) { }

    public async add(participant: model.IParticipant): Promise<model.IParticipant> {
        // Check validity of participant
        let validationResult = model.isValidParticipant(participant, true);
        if (!validationResult.isValid) {
            throw validationResult.errorMessage;
        }

        await this.participants.insertOne(participant);
        return participant;
    }

    public async isAdmin(googleSubject: string): Promise<boolean> {
        let result = await this.participants.find({
            googleSubject: googleSubject,
            roles: { isAdmin: true }
        }).limit(1).toArray();
        return result.length > 0;
    }
}

export default ParticipantStore;