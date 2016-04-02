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

export interface IStoreBase<T> {
    getById(_id: string): Promise<T>;
}

export interface IEventStore extends IStoreBase<model.IEvent> {
    getAll(includePastEvents: boolean): Promise<model.IEvent[]>;
    getById(_id: string): Promise<model.IEvent>;
    add(event: model.IEvent): Promise<model.IEvent>;
}

export interface IParticipantStore extends IStoreBase<model.IParticipant> {
    isAdmin(googleSubject: string): Promise<boolean>;
    add(participant: model.IParticipant): Promise<model.IParticipant>;
    getById(_id: string): Promise<model.IParticipant>;
    getAllSummary() : Promise<model.IParticipantSummary>;
}
