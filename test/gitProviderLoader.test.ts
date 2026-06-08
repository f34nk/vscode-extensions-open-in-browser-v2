import * as assert from 'assert';
import { GitProviderLoader } from '../out/gitProviderLoader';
import { resetVscodeMock } from './helpers/vscodeMock';

describe('GitProviderLoader', () => {
  afterEach(() => {
    resetVscodeMock();
  });

  it('loads built-in default git providers when no custom config exists', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new GitProviderLoader();

    const config = await loader.loadConfig();
    assert.ok(config);
    assert.ok(config!.git_provider.GITHUB_SSH);
    assert.ok(config!.git_provider.GITHUB_HTTPS);
    assert.ok(config!.git_provider.GITLAB);
  });

  it('includes all default providers in provider_check_order', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new GitProviderLoader();

    const config = await loader.loadConfig();
    const providerIds = Object.keys(config!.git_provider);
    const order = config!.settings!.provider_check_order!;

    for (const providerId of providerIds) {
      assert.ok(order.includes(providerId), `Missing ${providerId} in provider_check_order`);
    }
  });

  it('returns empty config paths when using built-in defaults only', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new GitProviderLoader();
    await loader.loadConfig();

    assert.deepStrictEqual(loader.getConfigPaths(), []);
  });

  it('reloads configuration on demand', async () => {
    resetVscodeMock({ config: { values: {} } });
    const loader = new GitProviderLoader();

    const initial = await loader.loadConfig();
    const reloaded = await loader.reloadConfig();

    assert.ok(initial);
    assert.ok(reloaded);
    assert.strictEqual(
      Object.keys(reloaded!.git_provider).length,
      Object.keys(initial!.git_provider).length
    );
  });
});
