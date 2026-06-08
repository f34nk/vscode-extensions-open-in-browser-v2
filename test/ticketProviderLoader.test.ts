import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { TicketProviderLoader } from '../out/ticketProviderLoader';
import { TicketUrlBuilder } from '../out/ticketUrlBuilder';
import { resetVscodeMock, vscodeMock } from './helpers/vscodeMock';

describe('TicketProviderLoader', () => {
  let outputChannel: { appendLine: (line: string) => void; lines: string[] };

  beforeEach(() => {
    outputChannel = {
      lines: [],
      appendLine(line: string) {
        this.lines.push(line);
      }
    };
  });

  afterEach(() => {
    resetVscodeMock();
  });

  it('loads built-in default ticket providers when no custom config exists', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new TicketProviderLoader(outputChannel as any);

    const config = await loader.loadConfig();
    assert.ok(config);
    assert.ok(config!.ticket_provider.EXAMPLE_JIRA);
  });

  it('merges custom providers from workspace config file', async () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), '.test-tickets-'));
    const configFile = path.join(tempDir, 'tickets.toml');
    fs.writeFileSync(
      configFile,
      `
[ticket_provider.ACME_JIRA]
name = "Acme Jira"
ticket_pattern = "([A-Z]{2,5}-[0-9]{1,6})"
ticket_url_template = "https://acme.atlassian.net/browse/\${ticket_id}"
priority = 1

[ticket_provider.ACME_JIRA.captures]
ticket_id = 1
`
    );

    resetVscodeMock({
      config: { values: { ticketProviderConfigPath: configFile } },
      workspaceFolders: [{ uri: { fsPath: tempDir }, name: 'project', index: 0 }]
    });

    try {
      const loader = new TicketProviderLoader(outputChannel as any);
      const config = await loader.loadConfig();

      assert.ok(config!.ticket_provider.ACME_JIRA);
      assert.ok(config!.ticket_provider.EXAMPLE_JIRA);

      const builder = new TicketUrlBuilder(config!);
      const match = builder.extractTicket('feature/ACME-42-fix');
      assert.ok(match);
      assert.strictEqual(match!.url, 'https://acme.atlassian.net/browse/ACME-42');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('creates file watchers without throwing', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new TicketProviderLoader(vscodeMock.window.createOutputChannel('test') as any);

    const config = await loader.loadConfig();
    assert.ok(config);
    loader.dispose();
  });
});
