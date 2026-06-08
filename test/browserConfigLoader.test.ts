import * as assert from 'assert';
import { BrowserConfigLoader } from '../out/browserConfigLoader';
import { resetVscodeMock } from './helpers/vscodeMock';

describe('BrowserConfigLoader', () => {
  afterEach(() => {
    resetVscodeMock();
  });

  it('loads built-in default browsers when no custom config exists', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new BrowserConfigLoader();

    const config = await loader.loadConfig();
    assert.ok(config);
    assert.ok(config!.browser.CHROME);
    assert.ok(config!.browser.FIREFOX);
  });

  it('resolves browsers for the current platform', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new BrowserConfigLoader();

    const browsers = await loader.getAvailableBrowsers();
    assert.ok(browsers.length > 0);

    for (const browser of browsers) {
      assert.ok(browser.label);
      assert.ok(browser.executable);
      assert.ok(Array.isArray(browser.aliases));
    }
  });

  it('finds browsers by alias, id, and label', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new BrowserConfigLoader();
    await loader.loadConfig();

    const byAlias = await loader.findBrowser('chrome');
    assert.ok(byAlias);
    assert.strictEqual(byAlias!.id, 'CHROME');

    const byId = await loader.findBrowser('FIREFOX');
    assert.ok(byId);
    assert.strictEqual(byId!.executable, 'firefox');

    const byLabel = await loader.findBrowser('Mozilla Firefox');
    assert.ok(byLabel);
    assert.strictEqual(byLabel!.id, 'FIREFOX');
  });

  it('returns null for unknown browser names', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new BrowserConfigLoader();
    await loader.loadConfig();

    assert.strictEqual(await loader.findBrowser('not-a-browser'), null);
  });
});
