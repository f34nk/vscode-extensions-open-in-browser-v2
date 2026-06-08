"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const ticketUrlBuilder_1 = require("../out/ticketUrlBuilder");
const testConfig = {
    ticket_provider: {
        JIRA: {
            name: 'Jira',
            ticket_pattern: '([A-Z]{2,5}-[0-9]{1,6})',
            ticket_url_template: 'https://acme.atlassian.net/browse/${ticket_id}',
            priority: 2
        },
        LINEAR: {
            name: 'Linear',
            ticket_pattern: '(LIN-[0-9]{1,5})',
            ticket_url_template: 'https://linear.app/acme/issue/${ticket_id}',
            priority: 1
        },
        GITHUB: {
            name: 'GitHub Issues',
            ticket_pattern: '(#\\d+)',
            ticket_url_template: 'https://github.com/acme/app/issues/${ticket_number}',
            priority: 3
        }
    }
};
describe('TicketUrlBuilder', () => {
    let builder;
    beforeEach(() => {
        builder = new ticketUrlBuilder_1.TicketUrlBuilder(testConfig);
    });
    describe('extractTicket', () => {
        it('extracts Jira ticket IDs from branch names', () => {
            const match = builder.extractTicket('feature/PROJ-1234-add-login');
            assert.ok(match);
            assert.strictEqual(match.ticketId, 'PROJ-1234');
            assert.strictEqual(match.url, 'https://acme.atlassian.net/browse/PROJ-1234');
            assert.strictEqual(match.provider.name, 'Jira');
        });
        it('extracts Linear ticket IDs', () => {
            const match = builder.extractTicket('LIN-99-fix-bug');
            assert.ok(match);
            assert.strictEqual(match.ticketId, 'LIN-99');
            assert.strictEqual(match.url, 'https://linear.app/acme/issue/LIN-99');
        });
        it('extracts GitHub issue references', () => {
            const match = builder.extractTicket('fix-issue-#456');
            assert.ok(match);
            assert.strictEqual(match.ticketId, '#456');
            assert.strictEqual(match.url, 'https://github.com/acme/app/issues/456');
        });
        it('returns null when no ticket is found', () => {
            assert.strictEqual(builder.extractTicket('feature/no-ticket-here'), null);
        });
        it('respects priority when multiple patterns could match', () => {
            const match = builder.extractTicket('LIN-42');
            assert.strictEqual(match.providerId, 'LINEAR');
        });
        it('respects custom check_order over priority', () => {
            const orderedConfig = {
                ticket_provider: testConfig.ticket_provider,
                settings: {
                    check_order: ['GITHUB', 'JIRA', 'LINEAR']
                }
            };
            const orderedBuilder = new ticketUrlBuilder_1.TicketUrlBuilder(orderedConfig);
            const match = orderedBuilder.extractTicket('fix-issue-#456');
            assert.strictEqual(match.providerId, 'GITHUB');
            assert.strictEqual(match.ticketId, '#456');
        });
    });
    describe('global instance helpers', () => {
        afterEach(() => {
            (0, ticketUrlBuilder_1.setTicketUrlBuilder)(null);
        });
        it('extractTicketFromBranch uses the global builder', () => {
            (0, ticketUrlBuilder_1.setTicketUrlBuilder)(builder);
            const match = (0, ticketUrlBuilder_1.extractTicketFromBranch)('feature/PROJ-777');
            assert.ok(match);
            assert.strictEqual(match.ticketId, 'PROJ-777');
        });
        it('extractTicketFromBranch returns null without a builder', () => {
            assert.strictEqual((0, ticketUrlBuilder_1.extractTicketFromBranch)('feature/PROJ-777'), null);
        });
    });
});
//# sourceMappingURL=ticketUrlBuilder.test.js.map