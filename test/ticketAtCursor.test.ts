import * as assert from 'assert';
import { getTicketWordAt } from '../out/ticketAtCursor';
import { createMockDocument } from './helpers/vscodeMock';

describe('ticketAtCursor', () => {
  describe('getTicketWordAt', () => {
    it('extracts a GitHub-style issue reference', () => {
      const document = createMockDocument(['See issue #456 for details']);
      const word = getTicketWordAt(document as any, { line: 0, character: 11 } as any);
      assert.strictEqual(word, '#456');
    });

    it('extracts a Jira-style ticket id', () => {
      const document = createMockDocument(['Fix PROJ-1234 before release']);
      const word = getTicketWordAt(document as any, { line: 0, character: 8 } as any);
      assert.strictEqual(word, 'PROJ-1234');
    });

    it('extracts a numeric branch-style token', () => {
      const document = createMockDocument(['branch name: 123-foo']);
      const word = getTicketWordAt(document as any, { line: 0, character: 16 } as any);
      assert.strictEqual(word, '123-foo');
    });

    it('returns null when the cursor is on punctuation', () => {
      const document = createMockDocument(['!!!']);
      const word = getTicketWordAt(document as any, { line: 0, character: 1 } as any);
      assert.strictEqual(word, null);
    });
  });
});
