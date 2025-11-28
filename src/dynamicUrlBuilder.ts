/**
 * Dynamic URL builder using TOML configuration
 */

import * as crypto from 'crypto';
import { ProvidersConfig, ProviderConfig, TemplateContext } from './providerConfig';
import { processTemplate, buildTemplateContext } from './templateEngine';
import { GitInfo } from './git';

/**
 * Compute SHA256 hash of a string (used for GitHub/GitLab file diff fragments)
 * @param input String to hash (typically a file path)
 * @returns Hex-encoded SHA256 hash
 */
function computeSHA256Hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Global instance of dynamic URL builder (set by config loader)
let dynamicBuilderInstance: DynamicUrlBuilder | null = null;

/**
 * Set the dynamic URL builder instance
 * Called by config loader when configuration is loaded
 */
export function setDynamicUrlBuilder(builder: DynamicUrlBuilder | null): void {
  dynamicBuilderInstance = builder;
}

/**
 * Get the current dynamic URL builder instance
 */
export function getDynamicUrlBuilder(): DynamicUrlBuilder | null {
  return dynamicBuilderInstance;
}

/**
 * Build git provider URL from GitInfo
 * This is a convenience function that uses the global dynamic builder instance
 */
export function buildGitProviderUrl(gitInfo: GitInfo): string | null {
  if (!dynamicBuilderInstance) {
    return null;
  }

  try {
    if (gitInfo.isDirectory) {
      return dynamicBuilderInstance.buildDirectoryUrl(
        gitInfo.remoteUrl,
        gitInfo.branch,
        gitInfo.relativePath
      );
    } else {
      return dynamicBuilderInstance.buildFileUrl(
        gitInfo.remoteUrl,
        gitInfo.branch,
        gitInfo.relativePath,
        gitInfo.lineStart,
        gitInfo.lineEnd
      );
    }
  } catch (error) {
    console.error('Failed to build git provider URL:', error);
    return null;
  }
}

/**
 * Build PR list URL from remote URL
 * This is a convenience function that uses the global dynamic builder instance
 */
export function buildPrListUrl(remoteUrl: string): string | null {
  if (!dynamicBuilderInstance) {
    return null;
  }

  try {
    return dynamicBuilderInstance.buildPrListUrl(remoteUrl);
  } catch (error) {
    console.error('Failed to build PR list URL:', error);
    return null;
  }
}

/**
 * Build compare URL from remote URL and branches
 * This is a convenience function that uses the global dynamic builder instance
 */
export function buildCompareUrl(remoteUrl: string, baseBranch: string, currentBranch: string): string | null {
  if (!dynamicBuilderInstance) {
    return null;
  }

  try {
    return dynamicBuilderInstance.buildCompareUrl(remoteUrl, baseBranch, currentBranch);
  } catch (error) {
    console.error('Failed to build compare URL:', error);
    return null;
  }
}

/**
 * Build commit URL from remote URL and SHA
 * This is a convenience function that uses the global dynamic builder instance
 */
export function buildCommitUrl(remoteUrl: string, commitSha: string): string | null {
  if (!dynamicBuilderInstance) {
    return null;
  }

  try {
    return dynamicBuilderInstance.buildCommitUrl(remoteUrl, commitSha);
  } catch (error) {
    console.error('Failed to build commit URL:', error);
    return null;
  }
}

/**
 * Build file-specific commit URL with line number
 * This is a convenience function that uses the global dynamic builder instance
 */
export function buildCommitFileUrl(
  remoteUrl: string,
  commitSha: string,
  relativePath: string,
  lineNumber?: number
): string | null {
  if (!dynamicBuilderInstance) {
    return null;
  }

  try {
    return dynamicBuilderInstance.buildCommitFileUrl(remoteUrl, commitSha, relativePath, lineNumber);
  } catch (error) {
    console.error('Failed to build commit file URL:', error);
    return null;
  }
}

/**
 * Dynamic URL Builder
 * Builds URLs for git providers based on TOML configuration
 */
export class DynamicUrlBuilder {
  private config: ProvidersConfig;

  constructor(config: ProvidersConfig) {
    this.config = config;
  }

  /**
   * Get ordered list of providers to check
   * @returns Array of [providerId, providerConfig] tuples
   */
  private getProvidersInOrder(): [string, ProviderConfig][] {
    const providers = Object.entries(this.config.provider);

    // Check if there's a custom order defined
    const customOrder = this.config.settings ? this.config.settings.provider_check_order : undefined;

    if (customOrder && customOrder.length > 0) {
      // Sort according to custom order, putting unlisted ones at the end
      return providers.sort(([aId], [bId]) => {
        const aIndex = customOrder.indexOf(aId);
        const bIndex = customOrder.indexOf(bId);

        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    // No custom order, return as-is
    return providers;
  }

  /**
   * Detect which provider matches the remote URL
   * @param remoteUrl Git remote URL
   * @returns Matching provider config and regex match, or null if no match
   */
  detectProvider(remoteUrl: string): { provider: ProviderConfig; match: RegExpMatchArray } | null {
    const providers = this.getProvidersInOrder();

    for (const [providerId, provider] of providers) {
      try {
        const regex = new RegExp(provider.remote_url_pattern);
        const match = remoteUrl.match(regex);

        if (match) {
          return { provider, match };
        }
      } catch (error) {
        // Invalid regex pattern - skip this provider
        console.error(`Invalid regex for provider ${providerId}:`, error);
      }
    }

    return null;
  }

  /**
   * Build template context from provider match and standard variables
   * @param provider Provider configuration
   * @param match Regex match result
   * @param standardVars Standard variables (branch, relative_path, etc.)
   * @returns Complete template context
   */
  private buildContext(
    provider: ProviderConfig,
    match: RegExpMatchArray,
    standardVars: Partial<TemplateContext>
  ): TemplateContext {
    return buildTemplateContext(match, provider.captures, standardVars);
  }

  /**
   * Build file URL
   * @param remoteUrl Git remote URL
   * @param branch Current branch
   * @param relativePath File path relative to repo root
   * @param lineStart Starting line number (optional)
   * @param lineEnd Ending line number (optional)
   * @returns File URL or null if provider not detected
   */
  buildFileUrl(
    remoteUrl: string,
    branch: string,
    relativePath: string,
    lineStart?: number,
    lineEnd?: number
  ): string | null {
    const detection = this.detectProvider(remoteUrl);
    if (!detection) {
      return null;
    }

    const { provider, match } = detection;

    // Build context
    const context = this.buildContext(provider, match, {
      branch,
      relative_path: relativePath,
      line_start: lineStart,
      line_end: lineEnd
    });

    // Process file URL template
    let url = processTemplate(provider.file_url_template, context);

    // Add line fragment if line numbers provided
    if (lineStart !== undefined) {
      let fragment: string;
      if (lineEnd !== undefined && lineEnd !== lineStart) {
        // Line range
        fragment = processTemplate(provider.line_fragment_range, context);
      } else {
        // Single line
        fragment = processTemplate(provider.line_fragment_single, context);
      }
      url += fragment;
    }

    return url;
  }

  /**
   * Build directory URL
   * @param remoteUrl Git remote URL
   * @param branch Current branch
   * @param relativePath Directory path relative to repo root
   * @returns Directory URL or null if provider not detected
   */
  buildDirectoryUrl(
    remoteUrl: string,
    branch: string,
    relativePath: string
  ): string | null {
    const detection = this.detectProvider(remoteUrl);
    if (!detection) {
      return null;
    }

    const { provider, match } = detection;

    // Build context
    const context = this.buildContext(provider, match, {
      branch,
      relative_path: relativePath
    });

    // Process directory URL template
    return processTemplate(provider.directory_url_template, context);
  }

  /**
   * Build PR/MR list URL
   * @param remoteUrl Git remote URL
   * @returns PR list URL or null if not available
   */
  buildPrListUrl(remoteUrl: string): string | null {
    const detection = this.detectProvider(remoteUrl);
    if (!detection) {
      return null;
    }

    const { provider, match } = detection;

    if (!provider.pr_list_url_template) {
      return null;
    }

    // Build context (no standard vars needed for PR list)
    const context = this.buildContext(provider, match, {});

    // Process PR list URL template
    return processTemplate(provider.pr_list_url_template, context);
  }

  /**
   * Build compare URL
   * @param remoteUrl Git remote URL
   * @param baseBranch Base branch name
   * @param currentBranch Current branch name
   * @returns Compare URL or null if not available
   */
  buildCompareUrl(
    remoteUrl: string,
    baseBranch: string,
    currentBranch: string
  ): string | null {
    const detection = this.detectProvider(remoteUrl);
    if (!detection) {
      return null;
    }

    const { provider, match } = detection;

    if (!provider.compare_url_template) {
      return null;
    }

    // Build context
    const context = this.buildContext(provider, match, {
      base_branch: baseBranch,
      current_branch: currentBranch
    });

    // Process compare URL template
    return processTemplate(provider.compare_url_template, context);
  }

  /**
   * Build commit URL
   * @param remoteUrl Git remote URL
   * @param commitSha Commit SHA (full or short)
   * @returns Commit URL or null if not available
   */
  buildCommitUrl(
    remoteUrl: string,
    commitSha: string
  ): string | null {
    const detection = this.detectProvider(remoteUrl);
    if (!detection) {
      return null;
    }

    const { provider, match } = detection;

    if (!provider.commit_url_template) {
      return null;
    }

    // Build context
    const context = this.buildContext(provider, match, {
      commit_sha: commitSha
    });

    // Process commit URL template
    return processTemplate(provider.commit_url_template, context);
  }

  /**
   * Build file-specific commit URL with line number
   * Links directly to a file's diff within the commit, optionally highlighting a specific line
   * @param remoteUrl Git remote URL
   * @param commitSha Commit SHA
   * @param relativePath File path relative to repo root
   * @param lineNumber Line number (1-based, optional)
   * @returns File-specific commit URL or null if not available
   */
  buildCommitFileUrl(
    remoteUrl: string,
    commitSha: string,
    relativePath: string,
    lineNumber?: number
  ): string | null {
    const detection = this.detectProvider(remoteUrl);
    if (!detection) {
      return null;
    }

    const { provider, match } = detection;

    // If provider doesn't support file-specific commit URLs, fall back to basic commit URL
    if (!provider.commit_file_url_template) {
      return this.buildCommitUrl(remoteUrl, commitSha);
    }

    // Compute file hash (SHA256 for GitHub/GitLab-style providers)
    const fileHash = computeSHA256Hash(relativePath);

    // Build context with file-specific variables
    const context = this.buildContext(provider, match, {
      commit_sha: commitSha,
      commit_file_hash: fileHash,
      commit_file_path: relativePath,
      commit_line_number: lineNumber
    });

    // Process commit file URL template
    return processTemplate(provider.commit_file_url_template, context);
  }

  /**
   * Get provider name for debugging/logging
   * @param remoteUrl Git remote URL
   * @returns Provider name or null if not detected
   */
  getProviderName(remoteUrl: string): string | null {
    const detection = this.detectProvider(remoteUrl);
    return detection ? detection.provider.name : null;
  }

  /**
   * Get debug info for a remote URL
   * @param remoteUrl Git remote URL
   * @param standardVars Optional standard variables for testing
   * @returns Debug information object
   */
  getDebugInfo(
    remoteUrl: string,
    standardVars?: Partial<TemplateContext>
  ): {
    matched: boolean;
    providerName?: string;
    captures?: { [key: string]: any };
    sampleFileUrl?: string;
    samplePrUrl?: string;
    sampleCompareUrl?: string;
  } {
    const detection = this.detectProvider(remoteUrl);

    if (!detection) {
      return { matched: false };
    }

    const { provider, match } = detection;

    // Extract just the captured variables (not standard vars)
    const captures: { [key: string]: any } = {};
    for (const [name, index] of Object.entries(provider.captures)) {
      captures[name] = match[index];
    }

    const result: any = {
      matched: true,
      providerName: provider.name,
      captures
    };

    // Generate sample URLs if standard vars provided
    if (standardVars) {
      if (standardVars.branch && standardVars.relative_path) {
        result.sampleFileUrl = this.buildFileUrl(
          remoteUrl,
          standardVars.branch as string,
          standardVars.relative_path as string,
          standardVars.line_start as number | undefined,
          standardVars.line_end as number | undefined
        );
      }

      result.samplePrUrl = this.buildPrListUrl(remoteUrl);

      if (standardVars.base_branch && standardVars.current_branch) {
        result.sampleCompareUrl = this.buildCompareUrl(
          remoteUrl,
          standardVars.base_branch as string,
          standardVars.current_branch as string
        );
      }
    }

    return result;
  }
}
