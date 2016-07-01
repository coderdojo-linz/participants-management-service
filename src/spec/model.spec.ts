/// <reference path="../../typings/index.d.ts" />
import * as model from '../model';
import { ObjectID } from 'mongodb';

describe("Model", () => {
    it("validates MongoDB objects as expected", () => {
        expect(model.isValidMongoObject({}, true).isValid).toBeTruthy();
        expect(model.isValidMongoObject({}, false).isValid).toBeFalsy();
        expect(model.isValidMongoObject({ _id: new ObjectID() }, false).isValid).toBeTruthy();
        expect(model.isValidMongoObject({ _id: null }, false).isValid).toBeFalsy();
    });
});