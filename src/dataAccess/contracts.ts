/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';

export interface IDataContext {
    db: mongodb.Db;
    events: contracts.IEventStore;
    participants: contracts.IParticipantStore;
}

export interface IInitialAdmin {
    givenName: string;
    familyName: string;
    email: string;
    googleSubject: string;
}

export interface IEventStore {
    getAll(includePastEvents: boolean): Promise<model.IEvent[]>;
    getById(_id: string): Promise<model.IEvent>;
    add(event: model.IEvent): Promise<model.IEvent>;
}

export interface IParticipantStore {
    isAdmin(googleSubject: string): Promise<boolean>;
    add(participant: model.IParticipant): Promise<model.IParticipant>;
}
