import * as assert from 'assert';
import {
  processTemplate,
  encodePathSegment,
  encodeQueryParam,
  buildGitTemplateContext,
  validateTemplate,
  extractVariables
} from '../out/templateEngine';

describe('templateEngine', () => {
  describe('processTemplate', () => {
    it('substitutes variables from context', () => {
      const result = processTemplate(
        'https://example.com/${owner}/${repo}/tree/${branch}/${relative_path}',
        { owner: 'acme', repo: 'app', branch: 'main', relative_path: 'src/index.ts' }
      );
      assert.strictEqual(result, 'https://example.com/acme/app/tree/main/src/index.ts');
    });

    it('replaces missing variables with empty string', () => {
      const result = processTemplate('https://example.com/${missing}', {});
      assert.strictEqual(result, 'https://example.com/');
    });

    it('converts numeric values to strings', () => {
      const result = processTemplate('line=${line_start}', { line_start: 42 });
      assert.strictEqual(result, 'line=42');
    });
  });

  describe('encodePathSegment', () => {
    it('encodes path segments while preserving slashes', () => {
      assert.strictEqual(encodePathSegment('src/my file/app.ts'), 'src/my%20file/app.ts');
    });
  });

  describe('encodeQueryParam', () => {
    it('URL-encodes query parameter values', () => {
      assert.strictEqual(encodeQueryParam('refs/heads/main'), 'refs%2Fheads%2Fmain');
    });
  });

  describe('buildGitTemplateContext', () => {
    it('merges capture groups with standard variables', () => {
      const captures = ['full', 'acme', 'app'] as unknown as RegExpMatchArray;
      const context = buildGitTemplateContext(
        captures,
        { owner: 1, repo: 2 },
        { branch: 'main', relative_path: 'README.md' }
      );

      assert.deepStrictEqual(context, {
        branch: 'main',
        relative_path: 'README.md',
        owner: 'acme',
        repo: 'app'
      });
    });
  });

  describe('validateTemplate', () => {
    it('accepts valid templates', () => {
      assert.strictEqual(validateTemplate('https://x.com/${owner}'), true);
    });

    it('rejects unmatched braces', () => {
      assert.strictEqual(validateTemplate('https://x.com/${owner'), false);
    });

    it('rejects empty variable names', () => {
      assert.strictEqual(validateTemplate('https://x.com/${}'), false);
    });
  });

  describe('extractVariables', () => {
    it('returns all variable names in order', () => {
      assert.deepStrictEqual(
        extractVariables('${owner}/${repo}?branch=${branch}'),
        ['owner', 'repo', 'branch']
      );
    });
  });
});
