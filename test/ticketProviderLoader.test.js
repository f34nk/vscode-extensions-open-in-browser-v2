"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ticketProviderLoader_1 = require("../out/ticketProviderLoader");
const ticketUrlBuilder_1 = require("../out/ticketUrlBuilder");
const vscodeMock_1 = require("./helpers/vscodeMock");
describe('TicketProviderLoader', () => {
    let outputChannel;
    beforeEach(() => {
        outputChannel = {
            lines: [],
            appendLine(line) {
                this.lines.push(line);
            }
        };
    });
    afterEach(() => {
        (0, vscodeMock_1.resetVscodeMock)();
    });
    it('loads built-in default ticket providers when no custom config exists', async () => {
        (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
        const loader = new ticketProviderLoader_1.TicketProviderLoader(outputChannel);
        const config = await loader.loadConfig();
        assert.ok(config);
        assert.ok(config.ticket_provider.EXAMPLE_JIRA);
    });
    it('merges custom providers from workspace config file', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-in-browser-tickets-'));
        const cursorDir = path.join(tempDir, '.cursor');
        fs.mkdirSync(cursorDir, { recursive: true });
        const configFile = path.join(cursorDir, 'open-in-browser-tickets.toml');
        fs.writeFileSync(configFile, `
[ticket_provider.ACME_JIRA]
name = "Acme Jira"
ticket_pattern = "([A-Z]{2,5}-[0-9]{1,6})"
ticket_url_template = "https://acme.atlassian.net/browse/\${ticket_id}"
priority = 1

[ticket_provider.ACME_JIRA.captures]
ticket_id = 1
`);
        (0, vscodeMock_1.resetVscodeMock)({
            config: { values: {} },
            workspaceFolders: [{ uri: { fsPath: tempDir }, name: 'project', index: 0 }]
        });
        try {
            const loader = new ticketProviderLoader_1.TicketProviderLoader(outputChannel);
            const config = await loader.loadConfig();
            assert.ok(config.ticket_provider.ACME_JIRA);
            assert.ok(config.ticket_provider.EXAMPLE_JIRA);
            const builder = new ticketUrlBuilder_1.TicketUrlBuilder(config);
            const match = builder.extractTicket('feature/ACME-42-fix');
            assert.ok(match);
            assert.strictEqual(match.url, 'https://acme.atlassian.net/browse/ACME-42');
        }
        finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    it('creates file watchers without throwing', async () => {
        (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
        const loader = new ticketProviderLoader_1.TicketProviderLoader(vscodeMock_1.vscodeMock.window.createOutputChannel('test'));
        const config = await loader.loadConfig();
        assert.ok(config);
        loader.dispose();
    });
});
//# sourceMappingURL=ticketProviderLoader.test.js.map