import * as assert from 'assert';
import * as toml from '@iarna/toml';
import {
  DynamicUrlBuilder,
  setDynamicUrlBuilder,
  buildGitProviderUrl,
  buildPrListUrl,
  buildCompareUrl,
  buildCommitUrl,
  buildCommitFileUrl
} from '../out/dynamicUrlBuilder';
import { DEFAULT_GIT_PROVIDERS_TOML } from '../out/defaultGitProviders';

describe('dynamicUrlBuilder convenience functions', () => {
  afterEach(() => {
    setDynamicUrlBuilder(null);
  });

  it('returns null when builder is not initialized', () => {
    assert.strictEqual(buildPrListUrl('git@github.com:acme/app.git'), null);
  });

  it('delegates to the global builder instance', () => {
    const config = toml.parse(DEFAULT_GIT_PROVIDERS_TOML);
    setDynamicUrlBuilder(new DynamicUrlBuilder(config as any));

    const remote = 'git@github.com:acme/app.git';

    assert.strictEqual(
      buildPrListUrl(remote),
      'https://github.com/acme/app/pulls'
    );

    assert.strictEqual(
      buildCompareUrl(remote, 'main', 'feature/x'),
      'https://github.com/acme/app/compare/main...feature/x'
    );

    assert.strictEqual(
      buildCommitUrl(remote, 'abc123'),
      'https://github.com/acme/app/commit/abc123'
    );

    const fileUrl = buildGitProviderUrl({
      remoteUrl: remote,
      branch: 'main',
      repoRoot: '/tmp/repo',
      relativePath: 'README.md',
      lineStart: 3
    });
    assert.strictEqual(
      fileUrl,
      'https://github.com/acme/app/tree/main/README.md#L3'
    );

    const commitFileUrl = buildCommitFileUrl(remote, 'abc123', 'README.md', 3);
    assert.ok(commitFileUrl);
    assert.ok(commitFileUrl!.includes('/commit/abc123'));
  });
});
