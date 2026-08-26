import * as assert from 'assert';
import { openTicketInBrowser } from '../out/index';
import { resetOutputChannelForTests } from '../out/logger';
import {
  TicketUrlBuilder,
  setTicketUrlBuilder
} from '../out/ticketUrlBuilder';
import { TicketProvidersConfig } from '../out/ticketProviderConfig';
import {
  createMockDocument,
  createMockEditor,
  getSharedOutputChannelLines,
  resetVscodeMock
} from './helpers/vscodeMock';
import {
  resetTicketEditorTrackingForTests,
  setLastKnownFileEditorForTests
} from '../out/ticketAtCursor';

const testConfig: TicketProvidersConfig = {
  ticket_provider: {
    JIRA: {
      name: 'Jira',
      ticket_pattern: '([A-Z]{2,5}-[0-9]{1,6})',
      ticket_url_template: 'https://acme.atlassian.net/browse/${ticket_id}',
      priority: 1
    }
  }
};

describe('openTicketInBrowser', () => {
  beforeEach(() => {
    resetVscodeMock();
    resetOutputChannelForTests();
    resetTicketEditorTrackingForTests();
    setTicketUrlBuilder(new TicketUrlBuilder(testConfig));
  });

  afterEach(() => {
    setTicketUrlBuilder(null);
  });

  it('opens a matching cursor ticket without requiring a git repository', async () => {
    const document = createMockDocument(
      ['See PROJ-1234 for context'],
      '/tmp/notes/outside-any-repo.txt'
    );
    const editor = createMockEditor(document, 0, 8);
    resetVscodeMock({ activeEditor: editor, visibleEditors: [editor] });

    await openTicketInBrowser(undefined);

    const lines = getSharedOutputChannelLines().join('\n');
    assert.ok(!lines.includes('Not in a git repository.'));
    assert.ok(!lines.includes('Could not determine current branch.'));
  });

  it('stops after a non-matching cursor word instead of falling back to git', async () => {
    const document = createMockDocument(
      ['See PROJ 1234 for context'],
      '/tmp/notes/outside-any-repo.txt'
    );
    const editor = createMockEditor(document, 0, 6);
    resetVscodeMock({ activeEditor: editor, visibleEditors: [editor] });

    await openTicketInBrowser(undefined);

    const lines = getSharedOutputChannelLines().join('\n');
    assert.match(lines, /No ticket found in "PROJ" at cursor\./);
    assert.ok(!lines.includes('Not in a git repository.'));
  });

  it('uses branch fallback only when there is no cursor word', async () => {
    const document = createMockDocument(['!!!']);
    const editor = createMockEditor(document, 0, 1);
    resetVscodeMock({ activeEditor: editor, visibleEditors: [editor] });
    setLastKnownFileEditorForTests(editor as any);

    await openTicketInBrowser(undefined);

    const lines = getSharedOutputChannelLines().join('\n');
    assert.ok(!lines.includes('at cursor'));
    assert.ok(lines.includes('Not in a git repository.'));
  });
});
