"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const browserPicker_1 = require("../out/browserPicker");
describe('browserPicker', () => {
    const browser = {
        id: 'CHROME',
        label: 'Google Chrome',
        description: 'Fast browser',
        executable: 'google-chrome',
        aliases: ['chrome', 'google-chrome'],
        launch_args: ['--new-window']
    };
    it('converts a browser to a quick pick item', () => {
        const item = (0, browserPicker_1.browserToPickItem)(browser);
        assert.strictEqual(item.label, 'Google Chrome');
        assert.strictEqual(item.description, 'Fast browser');
        assert.strictEqual(item.standardName, 'google-chrome');
        assert.deepStrictEqual(item.acceptName, ['chrome', 'google-chrome']);
        assert.ok(item.detail.includes('chrome'));
    });
    it('converts multiple browsers to quick pick items', () => {
        const firefox = {
            id: 'FIREFOX',
            label: 'Firefox',
            description: 'Mozilla browser',
            executable: 'firefox',
            aliases: ['firefox'],
            launch_args: []
        };
        const items = (0, browserPicker_1.browsersToPickItems)([browser, firefox]);
        assert.strictEqual(items.length, 2);
        assert.strictEqual(items[0].standardName, 'google-chrome');
        assert.strictEqual(items[1].standardName, 'firefox');
    });
});
//# sourceMappingURL=browserPicker.test.js.map