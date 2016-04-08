/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';
import * as model from '../model';
import * as contracts from './contracts';

export interface IDataContext {
    db: mongodb.Db;
    events: contracts.IEventStore;
    participants: contracts.IParticipantStore;
    registrations: contracts.IRegistrationStore;
}

export interface IInitialAdmin {
    givenName: string;
    familyName: string;
    email: string;
    googleSubject: string;
}

export interface IStoreBase<T> {
    collection: mongodb.Collection;
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
    getAllSummary(): Promise<model.IParticipantSummary>;
    getByName(givenName: string, familyName: string): Promise<model.IParticipant>;
}

export interface IRegistrationStore extends IStoreBase<model.IRegistration> {
    checkIn(event: model.IEvent, participant: model.IParticipant): Promise<any>;
    getByEventId(eventId: string): Promise<model.IRegistration[]>;
}