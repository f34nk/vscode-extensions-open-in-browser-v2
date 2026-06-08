import * as assert from 'assert';
import { browserToPickItem, browsersToPickItems } from '../out/browserPicker';
import { ResolvedBrowser } from '../out/browserConfig';

describe('browserPicker', () => {
  const browser: ResolvedBrowser = {
    id: 'CHROME',
    label: 'Google Chrome',
    description: 'Fast browser',
    executable: 'google-chrome',
    aliases: ['chrome', 'google-chrome'],
    launch_args: ['--new-window']
  };

  it('converts a browser to a quick pick item', () => {
    const item = browserToPickItem(browser);
    assert.strictEqual(item.label, 'Google Chrome');
    assert.strictEqual(item.description, 'Fast browser');
    assert.strictEqual(item.standardName, 'google-chrome');
    assert.deepStrictEqual(item.acceptName, ['chrome', 'google-chrome']);
    assert.ok(item.detail!.includes('chrome'));
  });

  it('converts multiple browsers to quick pick items', () => {
    const firefox: ResolvedBrowser = {
      id: 'FIREFOX',
      label: 'Firefox',
      description: 'Mozilla browser',
      executable: 'firefox',
      aliases: ['firefox'],
      launch_args: []
    };

    const items = browsersToPickItems([browser, firefox]);
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].standardName, 'google-chrome');
    assert.strictEqual(items[1].standardName, 'firefox');
  });
});
