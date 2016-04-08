/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';

class StoreBase<T extends model.IMongoObject> implements contracts.IStoreBase<T> {
    constructor(public collection: mongodb.Collection) { }

    public async add(item: T, validator: (o: T, isNew: boolean) => model.IValidationResult, prepare: (o: T) => void): Promise<T> {
        // Check validity of new item
        let validationResult = validator(item, true);
        if (!validationResult.isValid) {
            throw validationResult.errorMessage;
        }

        prepare(item);

        await this.collection.insertOne(item);
        return item;
    }

    public async getById(_id: string): Promise<T> {
        let result = await this.collection.find({ _id: new mongodb.ObjectID(_id) }).limit(1).toArray();
        return (result.length !== 0) ? result[0] : null;
    }
}

export default StoreBase;