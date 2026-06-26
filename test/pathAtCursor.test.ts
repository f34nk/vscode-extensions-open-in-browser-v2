import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  parsePathToken,
  getPathAtCursor,
  resolvePathToAbsolute,
  formatPathForCopy
} from '../out/pathAtCursor';
import { resetVscodeMock, createMockDocument, createMockEditor } from './helpers/vscodeMock';

describe('pathAtCursor', () => {
  describe('parsePathToken', () => {
    it('parses simple relative paths', () => {
      const parsed = parsePathToken('src/foo.ts');
      assert.ok(parsed);
      assert.strictEqual(parsed!.filePath, 'src/foo.ts');
      assert.strictEqual(parsed!.line, undefined);
    });

    it('parses colon line suffixes', () => {
      const parsed = parsePathToken('src/foo.ts:10');
      assert.ok(parsed);
      assert.strictEqual(parsed!.filePath, 'src/foo.ts');
      assert.strictEqual(parsed!.line, 9);
    });

    it('parses colon line and column suffixes', () => {
      assert.deepStrictEqual(parsePathToken('src/foo.ts:10:5'), {
        filePath: 'src/foo.ts',
        line: 9,
        column: 4
      });
    });

    it('parses path:line: suffix with trailing colon', () => {
      assert.deepStrictEqual(parsePathToken('foo/bar/baz.txt:123:'), {
        filePath: 'foo/bar/baz.txt',
        line: 122,
        column: undefined
      });
    });

    it('parses path:line: suffix at cursor', () => {
      const document = createMockDocument(['    foo/bar/baz.txt:123:']);
      const parsed = getPathAtCursor(document as any, { line: 0, character: 20 } as any);
      assert.deepStrictEqual(parsed, {
        filePath: 'foo/bar/baz.txt',
        line: 122,
        column: undefined
      });
    });

    it('parses path:line:column suffix', () => {
      assert.deepStrictEqual(parsePathToken('foo/bar/baz.txt:123:10'), {
        filePath: 'foo/bar/baz.txt',
        line: 122,
        column: 9
      });
    });

    it('parses path:line:column suffix at cursor', () => {
      const document = createMockDocument(['    foo/bar/baz.txt:123:10']);
      const parsed = getPathAtCursor(document as any, { line: 0, character: 22 } as any);
      assert.deepStrictEqual(parsed, {
        filePath: 'foo/bar/baz.txt',
        line: 122,
        column: 9
      });
    });

    it('parses path:line:column: suffix with trailing colon (compiler output)', () => {
      assert.deepStrictEqual(parsePathToken('foo/bar/baz.txt:123:10:'), {
        filePath: 'foo/bar/baz.txt',
        line: 122,
        column: 9
      });
    });

    it('parses path:line:column: suffix at cursor in compiler output', () => {
      const document = createMockDocument(['    foo/bar/baz.txt:123:10: error message']);
      const parsed = getPathAtCursor(document as any, { line: 0, character: 15 } as any);
      assert.deepStrictEqual(parsed, {
        filePath: 'foo/bar/baz.txt',
        line: 122,
        column: 9
      });
    });

    it('parses line:column:path prefix format', () => {
      assert.deepStrictEqual(parsePathToken('29:31:foo/bar.txt'), {
        filePath: 'foo/bar.txt',
        line: 28,
        column: 30
      });
    });

    it('parses line:path prefix format', () => {
      assert.deepStrictEqual(parsePathToken('42:src/foo.ts'), {
        filePath: 'src/foo.ts',
        line: 41,
        column: undefined
      });
    });

    it('parses quoted line:column:path prefix format at cursor', () => {
      const document = createMockDocument(['ref = "29:31:foo/bar.txt";']);
      const parsed = getPathAtCursor(document as any, { line: 0, character: 18 } as any);
      assert.deepStrictEqual(parsed, {
        filePath: 'foo/bar.txt',
        line: 28,
        column: 30
      });
    });

    it('parses GitHub-style hash line suffixes', () => {
      const parsed = parsePathToken('src/foo.ts#L10-L20');
      assert.ok(parsed);
      assert.strictEqual(parsed!.filePath, 'src/foo.ts');
      assert.strictEqual(parsed!.line, 9);
    });

    it('rejects bare words without path separators or extensions', () => {
      assert.strictEqual(parsePathToken('hello'), null);
    });

    it('rejects HTTP URLs', () => {
      assert.strictEqual(parsePathToken('https://example.com/file.ts'), null);
    });

    it('rejects dot-only tokens', () => {
      assert.strictEqual(parsePathToken('.'), null);
      assert.strictEqual(parsePathToken('..'), null);
    });
  });

  describe('formatPathForCopy', () => {
    it('returns path only when no line', () => {
      assert.strictEqual(
        formatPathForCopy({ filePath: 'src/browserConfig.ts' }),
        'src/browserConfig.ts'
      );
    });

    it('returns path:line: when line only', () => {
      assert.strictEqual(
        formatPathForCopy({ filePath: 'src/foo.ts', line: 122 }),
        'src/foo.ts:123:'
      );
    });

    it('returns path:line:column when both present', () => {
      assert.strictEqual(
        formatPathForCopy({ filePath: 'src/browserConfig.ts', line: 122, column: 9 }),
        'src/browserConfig.ts:123:10'
      );
    });

    it('normalizes prefix-format tokens via parse + format', () => {
      const parsed = parsePathToken('29:31:foo/bar.txt');
      assert.ok(parsed);
      assert.strictEqual(formatPathForCopy(parsed!), 'foo/bar.txt:29:31');
    });

    it('normalizes trailing-colon line suffix', () => {
      const parsed = parsePathToken('foo/bar/baz.txt:123:');
      assert.ok(parsed);
      assert.strictEqual(formatPathForCopy(parsed!), 'foo/bar/baz.txt:123:');
    });

    it('normalizes GitHub hash line suffix', () => {
      const parsed = parsePathToken('src/foo.ts#L10');
      assert.ok(parsed);
      assert.strictEqual(formatPathForCopy(parsed!), 'src/foo.ts:10:');
    });
  });

  describe('getPathAtCursor', () => {
    it('expands path tokens around the cursor', () => {
      const document = createMockDocument(['import "./utils/helper.ts";']);
      const editor = createMockEditor(document, 0, 17);
      resetVscodeMock({ activeEditor: editor });

      const parsed = getPathAtCursor(document as any, { line: 0, character: 17 } as any);
      assert.ok(parsed);
      assert.strictEqual(parsed!.filePath, './utils/helper.ts');
    });

    it('extracts quoted paths', () => {
      const document = createMockDocument(['const p = "src/models/user.ts";']);
      const parsed = getPathAtCursor(document as any, { line: 0, character: 14 } as any);
      assert.ok(parsed);
      assert.strictEqual(parsed!.filePath, 'src/models/user.ts');
    });
  });

  describe('resolvePathToAbsolute', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(process.cwd(), '.test-workspace-'));
      resetVscodeMock({
        workspaceFolders: [{ uri: { fsPath: tempDir }, name: 'project', index: 0 }]
      });
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('resolves absolute paths that exist', () => {
      const filePath = path.join(tempDir, 'README.md');
      fs.writeFileSync(filePath, '# test');

      assert.strictEqual(resolvePathToAbsolute(filePath, ''), filePath);
    });

    it('resolves workspace-relative paths', () => {
      const relative = 'src/index.ts';
      const absolute = path.join(tempDir, relative);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, 'export {};');

      assert.strictEqual(resolvePathToAbsolute(relative, ''), absolute);
    });

    it('resolves paths relative to the current document', () => {
      const docDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docDir, { recursive: true });
      const sibling = path.join(docDir, 'guide.md');
      fs.writeFileSync(sibling, 'guide');

      assert.strictEqual(
        resolvePathToAbsolute('guide.md', path.join(docDir, 'index.md')),
        sibling
      );
    });

    it('returns workspace-relative path when file does not exist yet', () => {
      const missing = 'src/not-created-yet.ts';
      assert.strictEqual(resolvePathToAbsolute(missing, ''), path.join(tempDir, missing));
    });
  });
});
