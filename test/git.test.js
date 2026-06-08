"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const git_1 = require("../out/git");
const vscodeMock_1 = require("./helpers/vscodeMock");
describe('git helpers', () => {
    afterEach(() => {
        (0, vscodeMock_1.resetVscodeMock)();
    });
    describe('getLineInfo', () => {
        it('returns cursor line when selection is empty', () => {
            const document = (0, vscodeMock_1.createMockDocument)(['line one', 'line two']);
            const editor = (0, vscodeMock_1.createMockEditor)(document, 1, 4);
            (0, vscodeMock_1.resetVscodeMock)({ activeEditor: editor });
            assert.deepStrictEqual((0, git_1.getLineInfo)(), { lineStart: 2 });
        });
        it('returns a line range for multi-line selections', () => {
            const document = (0, vscodeMock_1.createMockDocument)(['a', 'b', 'c', 'd']);
            (0, vscodeMock_1.resetVscodeMock)({
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
            assert.deepStrictEqual((0, git_1.getLineInfo)(), { lineStart: 2, lineEnd: 4 });
        });
        it('returns empty object when no editor is active', () => {
            (0, vscodeMock_1.resetVscodeMock)();
            assert.deepStrictEqual((0, git_1.getLineInfo)(), {});
        });
    });
    describe('configuration helpers', () => {
        it('defaults preferGitUrl to true', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
            assert.strictEqual((0, git_1.isGitUrlPreferred)(), true);
        });
        it('respects preferGitUrl=false', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: { preferGitUrl: false } } });
            assert.strictEqual((0, git_1.isGitUrlPreferred)(), false);
        });
        it('defaults includeLineNumbers to true', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
            assert.strictEqual((0, git_1.isLineNumbersEnabled)(), true);
        });
        it('respects includeLineNumbers=false', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: { includeLineNumbers: false } } });
            assert.strictEqual((0, git_1.isLineNumbersEnabled)(), false);
        });
        it('returns configured default base branch', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: { defaultBaseBranch: 'develop' } } });
            assert.strictEqual((0, git_1.getConfiguredBaseBranch)(), 'develop');
        });
        it('falls back to main for default base branch', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
            assert.strictEqual((0, git_1.getConfiguredBaseBranch)(), 'main');
        });
    });
});
//# sourceMappingURL=git.test.js.map