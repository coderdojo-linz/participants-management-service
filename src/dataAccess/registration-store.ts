/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';
import StoreBase from './store-base';

class RegistrationStore extends StoreBase<model.IRegistration> implements contracts.IRegistrationStore {
    constructor(registrations: mongodb.Collection) { 
        super(registrations);
    }

    public async checkIn(event: model.IEvent, participant: model.IParticipant): Promise<boolean> {
        let existingCheckin = await this.collection.find({ "event.id": event._id, "participant.id": participant._id, checkedin: true }).toArray();
        if (existingCheckin.length > 0) {
            return false;
        }
        
        await this.collection.updateOne({ "event.id": event._id, "participant.id": participant._id },
            { $set: { event: { id: event._id, date: event.date }, 
                participant: { id: participant._id, givenName: participant.givenName, familyName: participant.familyName }, 
                checkedin: true } },
            { upsert: true });
        return true;
    }
    
    public async getByEventId(eventId: string): Promise<model.IRegistration[]> {
        return await this.collection.find({ "event.id": new mongodb.ObjectID(eventId) })
            .project({ "_id": 1, "participant": 1, "registered": 1, "checkedin": 1, "needsComputer": 1 })
            .sort({ "participant.familyName": 1 }).toArray();
    }
    
    public async upsertByEventAndParticipant(registration: model.IRegistration): Promise<model.IRegistration> {
        // Note that the following statement does not update the checkedin property.
        // Use method checkIn for that.
        let set : any = { event: registration.event, participant: registration.participant,
                registered: registration.registered };
        if (typeof registration.needsComputer !== "undefined") {
            set.needsComputer = registration.needsComputer;
        }
        
        let upsertResult = await this.collection.findOneAndUpdate(
            { "event.id": registration.event.id, "participant.id": registration.participant.id },
            { $set: set }, { upsert: true });
        return upsertResult.lastErrorObject.updatedExisting
            ? upsertResult.value
            : await this.getById(upsertResult.lastErrorObject.upserted);
    }
}

export default RegistrationStore;