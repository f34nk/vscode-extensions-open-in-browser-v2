"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const pathAtCursor_1 = require("../out/pathAtCursor");
const vscodeMock_1 = require("./helpers/vscodeMock");
describe('pathAtCursor', () => {
    describe('parsePathToken', () => {
        it('parses simple relative paths', () => {
            assert.deepStrictEqual((0, pathAtCursor_1.parsePathToken)('src/foo.ts'), {
                filePath: 'src/foo.ts'
            });
        });
        it('parses colon line suffixes', () => {
            assert.deepStrictEqual((0, pathAtCursor_1.parsePathToken)('src/foo.ts:10'), {
                filePath: 'src/foo.ts',
                line: 9
            });
        });
        it('parses colon line and column suffixes', () => {
            assert.deepStrictEqual((0, pathAtCursor_1.parsePathToken)('src/foo.ts:10:5'), {
                filePath: 'src/foo.ts',
                line: 9,
                column: 4
            });
        });
        it('parses GitHub-style hash line suffixes', () => {
            assert.deepStrictEqual((0, pathAtCursor_1.parsePathToken)('src/foo.ts#L10-L20'), {
                filePath: 'src/foo.ts',
                line: 9
            });
        });
        it('rejects bare words without path separators or extensions', () => {
            assert.strictEqual((0, pathAtCursor_1.parsePathToken)('hello'), null);
        });
        it('rejects HTTP URLs', () => {
            assert.strictEqual((0, pathAtCursor_1.parsePathToken)('https://example.com/file.ts'), null);
        });
        it('rejects dot-only tokens', () => {
            assert.strictEqual((0, pathAtCursor_1.parsePathToken)('.'), null);
            assert.strictEqual((0, pathAtCursor_1.parsePathToken)('..'), null);
        });
    });
    describe('getPathAtCursor', () => {
        it('expands path tokens around the cursor', () => {
            const document = (0, vscodeMock_1.createMockDocument)(['import "./utils/helper.ts";']);
            const editor = (0, vscodeMock_1.createMockEditor)(document, 0, 17);
            (0, vscodeMock_1.resetVscodeMock)({ activeEditor: editor });
            const parsed = (0, pathAtCursor_1.getPathAtCursor)(document, { line: 0, character: 17 });
            assert.deepStrictEqual(parsed, { filePath: './utils/helper.ts' });
        });
        it('extracts quoted paths', () => {
            const document = (0, vscodeMock_1.createMockDocument)(['const p = "src/models/user.ts";']);
            const parsed = (0, pathAtCursor_1.getPathAtCursor)(document, { line: 0, character: 14 });
            assert.deepStrictEqual(parsed, { filePath: 'src/models/user.ts' });
        });
    });
    describe('resolvePathToAbsolute', () => {
        let tempDir;
        beforeEach(() => {
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-in-browser-test-'));
            (0, vscodeMock_1.resetVscodeMock)({
                workspaceFolders: [{ uri: { fsPath: tempDir }, name: 'project', index: 0 }]
            });
        });
        afterEach(() => {
            fs.rmSync(tempDir, { recursive: true, force: true });
        });
        it('resolves absolute paths that exist', () => {
            const filePath = path.join(tempDir, 'README.md');
            fs.writeFileSync(filePath, '# test');
            assert.strictEqual((0, pathAtCursor_1.resolvePathToAbsolute)(filePath, ''), filePath);
        });
        it('resolves workspace-relative paths', () => {
            const relative = 'src/index.ts';
            const absolute = path.join(tempDir, relative);
            fs.mkdirSync(path.dirname(absolute), { recursive: true });
            fs.writeFileSync(absolute, 'export {};');
            assert.strictEqual((0, pathAtCursor_1.resolvePathToAbsolute)(relative, ''), absolute);
        });
        it('resolves paths relative to the current document', () => {
            const docDir = path.join(tempDir, 'docs');
            fs.mkdirSync(docDir, { recursive: true });
            const sibling = path.join(docDir, 'guide.md');
            fs.writeFileSync(sibling, 'guide');
            assert.strictEqual((0, pathAtCursor_1.resolvePathToAbsolute)('guide.md', path.join(docDir, 'index.md')), sibling);
        });
        it('expands home directory paths', () => {
            const homeFile = path.join(os.homedir(), '.open-in-browser-test-file');
            fs.writeFileSync(homeFile, 'test');
            try {
                assert.strictEqual((0, pathAtCursor_1.resolvePathToAbsolute)('~/.open-in-browser-test-file', ''), homeFile);
            }
            finally {
                fs.unlinkSync(homeFile);
            }
        });
    });
});
//# sourceMappingURL=pathAtCursor.test.js.map