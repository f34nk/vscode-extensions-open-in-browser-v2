"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const terminal_1 = require("../out/terminal");
const vscodeMock_1 = require("./helpers/vscodeMock");
describe('terminal helpers', () => {
    afterEach(() => {
        (0, vscodeMock_1.resetVscodeMock)();
    });
    describe('isDirectory', () => {
        it('returns true for directories', () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-in-browser-dir-'));
            try {
                assert.strictEqual((0, terminal_1.isDirectory)(dir), true);
            }
            finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });
        it('returns false for files', () => {
            const file = path.join(os.tmpdir(), `open-in-browser-file-${Date.now()}.txt`);
            fs.writeFileSync(file, 'test');
            try {
                assert.strictEqual((0, terminal_1.isDirectory)(file), false);
            }
            finally {
                fs.unlinkSync(file);
            }
        });
        it('returns false for missing paths', () => {
            assert.strictEqual((0, terminal_1.isDirectory)('/path/that/does/not/exist'), false);
        });
    });
    describe('isTerminalActive', () => {
        it('returns false when no terminal is active', () => {
            (0, vscodeMock_1.resetVscodeMock)();
            assert.strictEqual((0, terminal_1.isTerminalActive)(), false);
        });
        it('returns true when a terminal is active', () => {
            (0, vscodeMock_1.resetVscodeMock)({ activeTerminal: { name: 'bash' } });
            assert.strictEqual((0, terminal_1.isTerminalActive)(), true);
        });
    });
    describe('isTerminalSupportEnabled', () => {
        it('defaults to enabled', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
            assert.strictEqual((0, terminal_1.isTerminalSupportEnabled)(), true);
        });
        it('respects enableTerminalSupport=false', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: { enableTerminalSupport: false } } });
            assert.strictEqual((0, terminal_1.isTerminalSupportEnabled)(), false);
        });
    });
});
//# sourceMappingURL=terminal.test.js.map