/// <reference path="../typings/index.d.ts" />

export const GOOGLE_APP_ID = process.env.GOOGLE_APP_ID || "<tenant>.apps.googleusercontent.com";
export const MONGO_URL = process.env.MONGO_URL || "mongodb://<dbuser>:<dbpassword>@<server>.mlab.com:<port>/<db>";
export const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN || "dUmMyT0kEn";
export const EVENTBRITE_SERIES_ID = process.env.EVENTBRITE_SERIES_ID || 4711;
export const CODER_TICKET_CLASS_NAMES = process.env.CODER_TICKET_CLASS_NAME || "Coder|Master Coder";
export const EVENTBRITE_QUESTION_YEAR_OF_BIRTH = process.env.EVENTBRITE_QUESTION_YEAR_OF_BIRTH || "Geburtsjahr";
export const EVENTBRITE_QUESTION_NEEDS_COMPUTER = process.env.EVENTBRITE_QUESTION_NEEDS_COMPUTER || "Leih-Notebook";
export const EVENTBRITE_QUESTION_YES = process.env.EVENTBRITE_QUESTION_NEEDS_COMPUTER || "Ja";
export const APP_INSIGHTS_KEY = process.env.APP_INSIGHTS_KEY || "00000000-0000-0000-0000-000000000000";