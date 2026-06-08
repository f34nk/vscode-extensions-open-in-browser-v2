import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  isDirectory,
  isTerminalActive,
  isTerminalSupportEnabled
} from '../out/terminal';
import { resetVscodeMock } from './helpers/vscodeMock';

describe('terminal helpers', () => {
  afterEach(() => {
    resetVscodeMock();
  });

  describe('isDirectory', () => {
    it('returns true for directories', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-in-browser-dir-'));
      try {
        assert.strictEqual(isDirectory(dir), true);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('returns false for files', () => {
      const file = path.join(os.tmpdir(), `open-in-browser-file-${Date.now()}.txt`);
      fs.writeFileSync(file, 'test');
      try {
        assert.strictEqual(isDirectory(file), false);
      } finally {
        fs.unlinkSync(file);
      }
    });

    it('returns false for missing paths', () => {
      assert.strictEqual(isDirectory('/path/that/does/not/exist'), false);
    });
  });

  describe('isTerminalActive', () => {
    it('returns false when no terminal is active', () => {
      resetVscodeMock();
      assert.strictEqual(isTerminalActive(), false);
    });

    it('returns true when a terminal is active', () => {
      resetVscodeMock({ activeTerminal: { name: 'bash' } });
      assert.strictEqual(isTerminalActive(), true);
    });
  });

  describe('isTerminalSupportEnabled', () => {
    it('defaults to enabled', () => {
      resetVscodeMock({ config: { values: {} } });
      assert.strictEqual(isTerminalSupportEnabled(), true);
    });

    it('respects enableTerminalSupport=false', () => {
      resetVscodeMock({ config: { values: { enableTerminalSupport: false } } });
      assert.strictEqual(isTerminalSupportEnabled(), false);
    });
  });
});
