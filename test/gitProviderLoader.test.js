"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const gitProviderLoader_1 = require("../out/gitProviderLoader");
const vscodeMock_1 = require("./helpers/vscodeMock");
describe('GitProviderLoader', () => {
    afterEach(() => {
        (0, vscodeMock_1.resetVscodeMock)();
    });
    it('loads built-in default git providers when no custom config exists', async () => {
        (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
        const loader = new gitProviderLoader_1.GitProviderLoader();
        const config = await loader.loadConfig();
        assert.ok(config);
        assert.ok(config.git_provider.GITHUB_SSH);
        assert.ok(config.git_provider.GITHUB_HTTPS);
        assert.ok(config.git_provider.GITLAB);
    });
    it('includes all default providers in provider_check_order', async () => {
        (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
        const loader = new gitProviderLoader_1.GitProviderLoader();
        const config = await loader.loadConfig();
        const providerIds = Object.keys(config.git_provider);
        const order = config.settings.provider_check_order;
        for (const providerId of providerIds) {
            assert.ok(order.includes(providerId), `Missing ${providerId} in provider_check_order`);
        }
    });
    it('returns empty config paths when using built-in defaults only', async () => {
        (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
        const loader = new gitProviderLoader_1.GitProviderLoader();
        await loader.loadConfig();
        assert.deepStrictEqual(loader.getConfigPaths(), []);
    });
    it('reloads configuration on demand', async () => {
        (0, vscodeMock_1.resetVscodeMock)({ config: { values: {} } });
        const loader = new gitProviderLoader_1.GitProviderLoader();
        const initial = await loader.loadConfig();
        const reloaded = await loader.reloadConfig();
        assert.ok(initial);
        assert.ok(reloaded);
        assert.strictEqual(Object.keys(reloaded.git_provider).length, Object.keys(initial.git_provider).length);
    });
});
//# sourceMappingURL=gitProviderLoader.test.js.map