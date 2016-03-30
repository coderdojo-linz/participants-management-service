/// <reference path="../typings/main.d.ts" />
import { ObjectID } from 'mongodb';

/**
 * Represents a MongoDB object with an ID
 */
export interface IMongoObject {
    _id?: ObjectID;
}

export interface IValidationResult {
    isValid: boolean;
    errorMessage?: string;
}

/**
 * Checks whether an object is valid.
 * @param o - Object to validate
 * @param isNew - Indicates whether the object is a new object (_id can be empty)
 *                or an existing one (_id cannot be empty).
 */
export function isValidMongoObject(o: IMongoObject, isNew: boolean): IValidationResult {
    if (!isNew) {
        if (!o._id) {
            return { isValid: false, errorMessage: "Mandatory member '_id' is missing. Can only be left out for new objects." };
        }

        if (!(o._id instanceof ObjectID)) {
            return { isValid: false, errorMessage: "'_id' is not of type 'ObjectID'." };
        }
    }

    return { isValid: true };
}

export interface IEvent extends IMongoObject {
    date: Date;
    location: string;
}

export function isValidEvent(event: IEvent, isNew: boolean): IValidationResult {
    var result = isValidMongoObject(event, isNew);
    if (!result.isValid) {
        return result;
    }

    if (!event) {
        return { isValid: false, errorMessage: "'event' must not be null." };
    }

    if (!event.date) {
        return { isValid: false, errorMessage: "Mandatory member 'date' is missing." };
    }

    if (!(event.date instanceof Date)) {
        return { isValid: false, errorMessage: "'date' is not of type 'Date'." };
    }

    if (!event.location) {
        return { isValid: false, errorMessage: "Mandatory member 'location' is missing." };
    }

    if (typeof event.location !== "string") {
        return { isValid: false, errorMessage: "'location' is not of type 'string'." };
    }

    return { isValid: true };
}

export interface IParticipantRoles {
    isAdmin?: boolean;
}

export interface IParticipant {
    givenName?: string;
    familyName?: string;
    email?: string;
    googleSubject?: string;
    roles?: IParticipantRoles;
}

export function isValidParticipant(participant: IParticipant, isNew: boolean): IValidationResult {
    var result = isValidMongoObject(participant, isNew);
    if (!result.isValid) {
        return result;
    }
    
    return { isValid: true };    
}