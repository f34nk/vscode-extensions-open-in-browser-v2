"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const toml = require("@iarna/toml");
const dynamicUrlBuilder_1 = require("../out/dynamicUrlBuilder");
const defaultGitProviders_1 = require("../out/defaultGitProviders");
describe('dynamicUrlBuilder convenience functions', () => {
    afterEach(() => {
        (0, dynamicUrlBuilder_1.setDynamicUrlBuilder)(null);
    });
    it('returns null when builder is not initialized', () => {
        assert.strictEqual((0, dynamicUrlBuilder_1.buildPrListUrl)('git@github.com:acme/app.git'), null);
    });
    it('delegates to the global builder instance', () => {
        const config = toml.parse(defaultGitProviders_1.DEFAULT_GIT_PROVIDERS_TOML);
        (0, dynamicUrlBuilder_1.setDynamicUrlBuilder)(new dynamicUrlBuilder_1.DynamicUrlBuilder(config));
        const remote = 'git@github.com:acme/app.git';
        assert.strictEqual((0, dynamicUrlBuilder_1.buildPrListUrl)(remote), 'https://github.com/acme/app/pulls');
        assert.strictEqual((0, dynamicUrlBuilder_1.buildCompareUrl)(remote, 'main', 'feature/x'), 'https://github.com/acme/app/compare/main...feature/x');
        assert.strictEqual((0, dynamicUrlBuilder_1.buildCommitUrl)(remote, 'abc123'), 'https://github.com/acme/app/commit/abc123');
        const fileUrl = (0, dynamicUrlBuilder_1.buildGitProviderUrl)({
            remoteUrl: remote,
            branch: 'main',
            repoRoot: '/tmp/repo',
            relativePath: 'README.md',
            lineStart: 3
        });
        assert.strictEqual(fileUrl, 'https://github.com/acme/app/tree/main/README.md#L3');
        const commitFileUrl = (0, dynamicUrlBuilder_1.buildCommitFileUrl)(remote, 'abc123', 'README.md', 3);
        assert.ok(commitFileUrl);
        assert.ok(commitFileUrl.includes('/commit/abc123'));
    });
});
//# sourceMappingURL=dynamicUrlBuilderConvenience.test.js.map