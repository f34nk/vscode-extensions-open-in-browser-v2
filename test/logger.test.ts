import * as assert from 'assert';
import {
  formatError,
  logError,
  logWarn,
  notifyError,
  resetOutputChannelForTests
} from '../out/logger';
import { getSharedOutputChannelLines, resetVscodeMock } from './helpers/vscodeMock';

describe('logger', () => {
  beforeEach(() => {
    resetVscodeMock();
    resetOutputChannelForTests();
  });

  describe('formatError', () => {
    it('formats Error instances with stack', () => {
      const error = new Error('boom');
      assert.ok(formatError(error).includes('boom'));
    });

    it('formats non-error values', () => {
      assert.strictEqual(formatError('plain text'), 'plain text');
    });
  });

  describe('logError', () => {
    it('writes timestamped errors with context, details, and stack', () => {
      logError('Open failed', {
        context: 'openUrl',
        details: { url: 'https://example.com', browser: 'firefox' },
        error: new Error('network')
      });

      const lines = getSharedOutputChannelLines();
      assert.strictEqual(lines.length, 3);
      assert.match(lines[0], /ERROR \[openUrl\] Open failed/);
      assert.strictEqual(lines[1], '  url: https://example.com\n  browser: firefox');
      assert.ok(lines[2].includes('network'));
    });
  });

  describe('notifyError', () => {
    it('logs before showing the notification', () => {
      notifyError('No ticket found', { context: 'openTicketInBrowser' });
      const lines = getSharedOutputChannelLines();
      assert.strictEqual(lines.length, 1);
      assert.match(lines[0], /ERROR \[openTicketInBrowser\] No ticket found/);
    });
  });

  describe('logWarn', () => {
    it('writes timestamped warnings', () => {
      logWarn('Unknown git provider, opening locally.', { context: 'buildUrl' });
      const lines = getSharedOutputChannelLines();
      assert.match(lines[0], /WARN \[buildUrl\] Unknown git provider/);
    });
  });
});
