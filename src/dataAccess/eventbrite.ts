/// <reference path="../../typings/index.d.ts" />
import * as mongodb from 'mongodb';
import * as contracts from './contracts';
import * as config from '../config';
import * as needle from 'needle';
import * as model from '../model';

class Eventbrite implements contracts.IEventbrite {
    private static headers = { headers: { "Authorization": `Bearer ${config.EVENTBRITE_TOKEN}` } };

    getEvents() : Promise<contracts.IEventbriteEvent[]> {
        return new Promise<any>((resolve, reject) => {
            needle.get(`https://www.eventbriteapi.com/v3/series/${config.EVENTBRITE_SERIES_ID}/events/?time_filter=current_future`, 
                Eventbrite.headers, (err, res) => {
                if (!err && res.statusCode == 200) {
                    resolve(res.body.events.map((e : any) => { return { id: e.id, date: new Date(e.start.utc) } }));
                } else {
                    reject();
                }
            });
        });
    }

    private getAttendeesPaged(eventId: string, page: number, ticketClass: string, questions: contracts.IEventbriteQuestions) : Promise<contracts.IEventbritePagedResult<contracts.IEventbriteAttendee>> {
        return new Promise<any>((resolve, reject) => {
            page = page || 1;
            needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/attendees/?page=${page}`, 
                Eventbrite.headers, (err, res) => {
                if (!err && res.statusCode == 200) {
                    let result : contracts.IEventbriteAttendee[] = [];
                    for(let e of res.body.attendees.filter((e: any) => e.ticket_class_id === ticketClass)) {
                        let resultItem : contracts.IEventbriteAttendee = { 
                            id: e.id,
                            givenName: e.profile.first_name,
                            familyName: e.profile.last_name,
                            email: e.profile.email,
                            attending: e.status === "Attending"
                        };
                        
                        for (let a of e.answers) {
                            if (a.question_id === questions.yearOfBirthQuestionId && a.answer) {
                                resultItem.yearOfBirth = a.answer;
                            }
                            
                            if (a.question_id === questions.needsComputerQuestionId && a.answer) {
                                resultItem.needsComputer = a.answer === config.EVENTBRITE_QUESTION_YES;
                            }
                        }
                        
                        result.push(resultItem);
                    }
                    
                    resolve({
                        pageNumber: res.body.pagination.page_number,
                        pageCount: res.body.pagination.page_count,
                        result: result
                    });
                } else {
                    reject(err);
                }
            });
        });
    }
    
    async getQuestions(eventId: string) : Promise<contracts.IEventbriteQuestions> {
        return new Promise<any>((resolve, reject) => {
            needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/questions/`, 
                Eventbrite.headers, (err, res) => {
                    if (!err && res.statusCode == 200) {
                        let result : contracts.IEventbriteQuestions = { };
                        for(var e of res.body.questions) {
                            if (e.question.text.indexOf(config.EVENTBRITE_QUESTION_YEAR_OF_BIRTH) > (-1)) {
                                result.yearOfBirthQuestionId = e.id;
                            } else if (e.question.text.indexOf(config.EVENTBRITE_QUESTION_NEEDS_COMPUTER) > (-1)) {
                                result.needsComputerQuestionId = e.id;
                            }
                        }
                        
                        resolve(result);
                    } else {
                        reject(err);
                    }
                });
        });        
    }
    
    async getAttendees(eventId: string, coderTicketClass: string) : Promise<contracts.IEventbriteAttendee[]> {
        let attendees : contracts.IEventbriteAttendee[] = [];
        let ebResult: contracts.IEventbritePagedResult<contracts.IEventbriteAttendee>;
        let page = 0;
        let questions = await this.getQuestions(eventId);
        do {
            ebResult = await this.getAttendeesPaged(eventId, ++page, coderTicketClass, questions);
            attendees = attendees.concat(ebResult.result);
        } while (page < ebResult.pageCount);
        
        return attendees;
    }

    private getTicketClasses(eventId: string) : Promise<contracts.IEventbriteTicketClass[]> {
        return new Promise<any>((resolve, reject) => {
            needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/ticket_classes/`, 
                Eventbrite.headers, (err, res) => {
                if (!err && res.statusCode == 200) {
                    resolve(res.body.ticket_classes.map((e : any) => { return { id: e.id, name: e.name }; }));
                } else {
                    reject(err);
                }
            });
        });
    }
    
    async getCoderTicketClass(eventId: string) : Promise<string> {
        let ticketClasses = await this.getTicketClasses(eventId);
        if (!ticketClasses || ticketClasses.length == 0) {
            throw `No ticket classes found for event ${eventId}`;
        }

        var filteredTicketClasses = ticketClasses.filter(tc => tc.name === config.CODER_TICKET_CLASS_NAME);
        if (filteredTicketClasses.length == 0) {
            throw `Ticket class ${config.CODER_TICKET_CLASS_NAME} not found for event ${eventId}`;
        }

        return filteredTicketClasses[0].id;
    }
}

export default Eventbrite;