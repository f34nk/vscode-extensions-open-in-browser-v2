import * as assert from 'assert';
import { defaultBrowser } from '../out/util';
import { resetVscodeMock } from './helpers/vscodeMock';

describe('util', () => {
  afterEach(() => {
    resetVscodeMock();
  });

  describe('defaultBrowser', () => {
    it('returns configured default browser name', () => {
      resetVscodeMock({ config: { values: { default: 'firefox' } } });
      assert.strictEqual(defaultBrowser(), 'firefox');
    });

    it('returns empty/undefined when not configured', () => {
      resetVscodeMock({ config: { values: {} } });
      assert.strictEqual(defaultBrowser(), undefined);
    });
  });
});
