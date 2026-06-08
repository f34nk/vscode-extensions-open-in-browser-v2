import * as assert from 'assert';
import * as toml from '@iarna/toml';
import { DynamicUrlBuilder } from '../out/dynamicUrlBuilder';
import { DEFAULT_GIT_PROVIDERS_TOML } from '../out/defaultGitProviders';
import { GitProvidersConfig } from '../out/gitProviderConfig';

function loadDefaultConfig(): GitProvidersConfig {
  return toml.parse(DEFAULT_GIT_PROVIDERS_TOML) as GitProvidersConfig;
}

describe('DynamicUrlBuilder', () => {
  let builder: DynamicUrlBuilder;

  beforeEach(() => {
    builder = new DynamicUrlBuilder(loadDefaultConfig());
  });

  const githubRemote = 'git@github.com:acme/widget.git';

  describe('detectProvider', () => {
    it('matches GitHub SSH remotes', () => {
      const detection = builder.detectProvider(githubRemote);
      assert.ok(detection);
      assert.strictEqual(detection!.provider.name, 'GitHub SSH');
    });

    it('returns null for unknown remotes', () => {
      assert.strictEqual(builder.detectProvider('git@unknown.example:org/repo.git'), null);
    });
  });

  describe('buildFileUrl', () => {
    it('builds GitHub file URLs with line number', () => {
      const url = builder.buildFileUrl(
        githubRemote,
        'feature/test',
        'src/app.ts',
        10
      );
      assert.strictEqual(
        url,
        'https://github.com/acme/widget/tree/feature/test/src/app.ts#L10'
      );
    });

    it('builds GitHub file URLs with line range', () => {
      const url = builder.buildFileUrl(
        githubRemote,
        'main',
        'src/app.ts',
        10,
        20
      );
      assert.strictEqual(
        url,
        'https://github.com/acme/widget/tree/main/src/app.ts#L10-L20'
      );
    });
  });

  describe('buildDirectoryUrl', () => {
    it('builds GitHub directory URLs', () => {
      const url = builder.buildDirectoryUrl(githubRemote, 'main', 'src/components');
      assert.strictEqual(
        url,
        'https://github.com/acme/widget/tree/main/src/components'
      );
    });
  });

  describe('buildPrListUrl', () => {
    it('builds GitHub PR list URLs', () => {
      const url = builder.buildPrListUrl(githubRemote);
      assert.strictEqual(url, 'https://github.com/acme/widget/pulls');
    });
  });

  describe('buildCompareUrl', () => {
    it('builds GitHub compare URLs', () => {
      const url = builder.buildCompareUrl(githubRemote, 'main', 'feature/xyz');
      assert.strictEqual(
        url,
        'https://github.com/acme/widget/compare/main...feature/xyz'
      );
    });
  });

  describe('buildCommitUrl', () => {
    it('builds GitHub commit URLs', () => {
      const sha = 'abc123def456789012345678901234567890abcd';
      const url = builder.buildCommitUrl(githubRemote, sha);
      assert.strictEqual(url, `https://github.com/acme/widget/commit/${sha}`);
    });
  });

  describe('buildCommitFileUrl', () => {
    it('builds GitHub commit file URLs with line hash', () => {
      const sha = 'abc123def456789012345678901234567890abcd';
      const url = builder.buildCommitFileUrl(
        githubRemote,
        sha,
        'src/app.ts',
        42
      );
      assert.ok(url);
      assert.ok(url!.startsWith(`https://github.com/acme/widget/commit/${sha}#diff-`));
      assert.ok(url!.endsWith('L42'));
    });

    it('falls back to basic commit URL when template missing', () => {
      const customConfig: GitProvidersConfig = {
        git_provider: {
          MINIMAL: {
            name: 'Minimal',
            remote_url_pattern: '^git@example\\.com:(.+)/(.+)\\.git$',
            file_url_template: 'https://example.com/${owner}/${repo}/${relative_path}',
            directory_url_template: 'https://example.com/${owner}/${repo}/${relative_path}',
            line_fragment_single: '',
            line_fragment_range: '',
            commit_url_template: 'https://example.com/${owner}/${repo}/commit/${commit_sha}',
            captures: { owner: 1, repo: 2 }
          }
        }
      };

      const minimalBuilder = new DynamicUrlBuilder(customConfig);
      const url = minimalBuilder.buildCommitFileUrl(
        'git@example.com:acme/app.git',
        'deadbeef',
        'src/main.ts',
        5
      );
      assert.strictEqual(url, 'https://example.com/acme/app/commit/deadbeef');
    });
  });

  describe('getDebugInfo', () => {
    it('returns sample URLs when standard vars are provided', () => {
      const info = builder.getDebugInfo(githubRemote, {
        branch: 'main',
        relative_path: 'src/example.ts',
        line_start: 42,
        line_end: 50,
        base_branch: 'main',
        current_branch: 'feature/test'
      });

      assert.strictEqual(info.matched, true);
      assert.strictEqual(info.providerName, 'GitHub SSH');
      assert.deepStrictEqual(info.captures, { owner: 'acme', repo: 'widget' });
      assert.ok(info.sampleFileUrl);
      assert.ok(info.samplePrUrl);
      assert.ok(info.sampleCompareUrl);
    });
  });

  describe('provider check order', () => {
    it('respects custom provider_check_order', () => {
      const config = loadDefaultConfig();
      config.settings = {
        provider_check_order: ['GITHUB_HTTPS', 'GITHUB_SSH']
      };
      const orderedBuilder = new DynamicUrlBuilder(config);

      const httpsRemote = 'https://github.com/acme/widget.git';
      const detection = orderedBuilder.detectProvider(httpsRemote);
      assert.strictEqual(detection!.provider.name, 'GitHub HTTPS');
    });
  });
});
