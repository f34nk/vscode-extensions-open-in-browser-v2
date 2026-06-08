import * as assert from 'assert';
import {
  getLineInfo,
  isGitUrlPreferred,
  isLineNumbersEnabled,
  getConfiguredBaseBranch
} from '../out/git';
import { resetVscodeMock, createMockDocument, createMockEditor } from './helpers/vscodeMock';

describe('git helpers', () => {
  afterEach(() => {
    resetVscodeMock();
  });

  describe('getLineInfo', () => {
    it('returns cursor line when selection is empty', () => {
      const document = createMockDocument(['line one', 'line two']);
      const editor = createMockEditor(document, 1, 4);
      resetVscodeMock({ activeEditor: editor });

      assert.deepStrictEqual(getLineInfo(), { lineStart: 2 });
    });

    it('returns a line range for multi-line selections', () => {
      const document = createMockDocument(['a', 'b', 'c', 'd']);
      resetVscodeMock({
        activeEditor: {
          document,
          selection: {
            active: { line: 1, character: 0 },
            start: { line: 1, character: 0 },
            end: { line: 3, character: 0 },
            isEmpty: false
          }
        }
      });

      assert.deepStrictEqual(getLineInfo(), { lineStart: 2, lineEnd: 4 });
    });

    it('returns empty object when no editor is active', () => {
      resetVscodeMock();
      assert.deepStrictEqual(getLineInfo(), {});
    });
  });

  describe('configuration helpers', () => {
    it('defaults preferGitUrl to true', () => {
      resetVscodeMock({ config: { values: {} } });
      assert.strictEqual(isGitUrlPreferred(), true);
    });

    it('respects preferGitUrl=false', () => {
      resetVscodeMock({ config: { values: { preferGitUrl: false } } });
      assert.strictEqual(isGitUrlPreferred(), false);
    });

    it('defaults includeLineNumbers to true', () => {
      resetVscodeMock({ config: { values: {} } });
      assert.strictEqual(isLineNumbersEnabled(), true);
    });

    it('respects includeLineNumbers=false', () => {
      resetVscodeMock({ config: { values: { includeLineNumbers: false } } });
      assert.strictEqual(isLineNumbersEnabled(), false);
    });

    it('returns configured default base branch', () => {
      resetVscodeMock({ config: { values: { defaultBaseBranch: 'develop' } } });
      assert.strictEqual(getConfiguredBaseBranch(), 'develop');
    });

    it('falls back to main for default base branch', () => {
      resetVscodeMock({ config: { values: {} } });
      assert.strictEqual(getConfiguredBaseBranch(), 'main');
    });
  });
});
