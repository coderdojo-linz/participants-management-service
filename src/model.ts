/// <reference path="../typings/main.d.ts" />
import { ObjectID } from 'mongodb';

export module Model {
    /**
     * Represents a MongoDB object with an ID
     */
    export interface IMongoObject {
        _id?: ObjectID;
    }

    /**
     * Checks whether an object is valid.
     * @param o - Object to validate
     * @param isNew - Indicates whether the object is a new object (_id can be empty)
     *                or an existing one (_id cannot be empty).
     */
    export function isValid(o: IMongoObject, isNew: boolean): [boolean, string] {
        if (!isNew) {
            if (!o._id) {
                return [false, "Mandatory member '_id' is missing. Can only be left out for new objects."];
            }

            if (!(o._id instanceof ObjectID)) {
                return [false, "'_id' is not of type 'ObjectID'."];
            }
        }

        return [true, null];
    }

    export module Event {
        export interface IEvent extends IMongoObject {
            date: Date;
            location: string;
        }

        export function isValid(event: IEvent, isNew: boolean): [boolean, string] {
            var isBaseValid = Model.isValid(event, isNew);
            if (!isBaseValid[0]) {
                return isBaseValid;
            }

            if (!event) {
                return [false, "'event' must not be null."];
            }

            if (!event.date) {
                return [false, "Mandatory member 'date' is missing."];
            }

            if (!(event.date instanceof Date)) {
                return [false, "'date' is not of type 'Date'."];
            }

            if (!event.location) {
                return [false, "Mandatory member 'location' is missing."];
            }

            if (typeof event.location !== "string") {
                return [false, "'location' is not of type 'string'."];
            }

            return [true, null];
        }
    }
}