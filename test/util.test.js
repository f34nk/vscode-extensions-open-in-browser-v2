"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const util_1 = require("../out/util");
const vscodeMock_1 = require("./helpers/vscodeMock");
describe('util', () => {
    afterEach(() => {
        (0, vscodeMock_1.resetVscodeMock)();
    });
    describe('defaultBrowser', () => {
        it('returns configured default browser name', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: { default: 'firefox' } } });
            assert.strictEqual((0, util_1.defaultBrowser)(), 'firefox');
        });
        it('returns empty string when not configured', () => {
            (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
            assert.strictEqual((0, util_1.defaultBrowser)(), '');
        });
    });
});
//# sourceMappingURL=util.test.js.map