/// <reference path="../../typings/main.d.ts" />
import * as mongodb from 'mongodb';

export module Admins {
    export interface IAdminStore {
        checkIfAdmin(googleSubject: string): Promise<boolean>;
    }
}