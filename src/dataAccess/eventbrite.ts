import * as mongodb from 'mongodb';
import * as contracts from './contracts';
import * as config from '../config';
import * as needle from 'needle';
import * as model from '../model';

class Eventbrite implements contracts.IEventbrite {
    private static headers = { headers: { "Authorization": `Bearer ${config.EVENTBRITE_TOKEN}` } };

    getEvents(): Promise<contracts.IEventbriteEvent[]> {
        return new Promise<any>((resolve, reject) => {
            needle.get(`https://www.eventbriteapi.com/v3/series/${config.EVENTBRITE_SERIES_ID}/events/?time_filter=current_future&order_by=start_asc`,
                Eventbrite.headers, (err, res) => {
                    if (!err && res.statusCode == 200) {
                        resolve(res.body.events.map((e: any) => { return { id: e.id, date: new Date(e.start.utc) } }));
                    } else {
                        reject();
                    }
                });
        });
    }

    async getTicketClassStatuses(eventIds: string[]): Promise<contracts.IEventbriteEventStatus[]> {
        const statuses = await Promise.all(eventIds.map(
            e => this.getTicketClassStatus(e, config.CODER_TICKET_CLASS_NAME)));
        return eventIds.map(e => {
            const status = statuses.filter(s => s.eventId == e)[0];
            return { eventId: e, quantitySold: status.quantitySold, quantityTotal: status.quantityTotal };
        });
    }

    private getTicketClassStatus(eventId: string, ticketClass: string): Promise<contracts.IEventbriteEventStatus> {
        return new Promise<any>(async (resolve, reject) => {
            const ticketClasses = await this.getCoderTicketClasses(eventId, ticketClass);
            if (ticketClasses.length != 1) {
                reject();
            }

            needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/ticket_classes/${ticketClasses[0]}/`,
                Eventbrite.headers, (err, res) => {
                    if (!err && res.statusCode == 200) {
                        resolve({
                            eventId: res.body.event_id,
                            quantitySold: res.body.quantity_sold,
                            quantityTotal: res.body.quantity_total
                        });
                    } else {
                        reject();
                    }
                });
        });
    }

    private getAttendeesPaged(eventId: string, page: number, ticketClass: string, questions: contracts.IEventbriteQuestions): Promise<contracts.IEventbritePagedResult<contracts.IEventbriteAttendee>> {
        return new Promise<any>((resolve, reject) => {
            page = page || 1;
            needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/attendees/?page=${page}`,
                Eventbrite.headers, (err, res) => {
                    if (!err && res.statusCode == 200) {
                        let result: contracts.IEventbriteAttendee[] = [];
                        for (let e of res.body.attendees.filter((e: any) => e.ticket_class_id === ticketClass)) {
                            let resultItem: contracts.IEventbriteAttendee = {
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

    async getQuestions(eventId: string): Promise<contracts.IEventbriteQuestions> {
        return new Promise<any>((resolve, reject) => {
            needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/questions/`,
                Eventbrite.headers, (err, res) => {
                    if (!err && res.statusCode == 200) {
                        let result: contracts.IEventbriteQuestions = {};
                        for (var e of res.body.questions) {
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

    async getAttendees(eventId: string, coderTicketClasses: string[]): Promise<contracts.IEventbriteAttendee[]> {
        let attendees: contracts.IEventbriteAttendee[] = [];
        let ebResult: contracts.IEventbritePagedResult<contracts.IEventbriteAttendee>;
        let questions = await this.getQuestions(eventId);
        for (let ticketClass of coderTicketClasses) {
            let page = 0;
            do {
                ebResult = await this.getAttendeesPaged(eventId, ++page, ticketClass, questions);
                attendees = attendees.concat(ebResult.result);
            } while (page < ebResult.pageCount);
        }

        return attendees;
    }

    private getTicketClasses(eventId: string): Promise<contracts.IEventbriteTicketClass[]> {
        return new Promise<any>((resolve, reject) => {
            needle.get(`https://www.eventbriteapi.com/v3/events/${eventId}/ticket_classes/`,
                Eventbrite.headers, (err, res) => {
                    if (!err && res.statusCode == 200) {
                        resolve(res.body.ticket_classes.map((e: any) => { return { id: e.id, name: e.name }; }));
                    } else {
                        reject(err);
                    }
                });
        });
    }

    async getCoderTicketClasses(eventId: string, ticketClassName: string = null): Promise<string[]> {
        let ticketClasses = await this.getTicketClasses(eventId);
        if (!ticketClasses || ticketClasses.length == 0) {
            throw `No ticket classes found for event ${eventId}`;
        }

        let classNames: string[];
        if (!ticketClassName) {
            classNames = config.CODER_TICKET_CLASS_NAMES.split('|');
        } else {
            classNames = [ticketClassName];
        }

        if (!classNames.length) {
            throw `Ticket class cofiguration ${config.CODER_TICKET_CLASS_NAMES} is invalid`;
        }

        let filteredTicketClasses = this.filterTicketClasses(ticketClasses, classNames);
        if (filteredTicketClasses.length == 0) {
            throw `Ticket class ${config.CODER_TICKET_CLASS_NAMES} not found for event ${eventId}`;
        }

        return filteredTicketClasses;
    }

    private filterTicketClasses(eventbriteTicketClasses: contracts.IEventbriteTicketClass[], filteredTicketClasses: string[]): string[] {
        return eventbriteTicketClasses
            .filter(tc => filteredTicketClasses.filter(cn => cn === tc.name).length > 0)
            .map(tc => tc.id);
    }
}

export default Eventbrite;