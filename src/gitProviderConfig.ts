/**
 * Git provider configuration types for TOML-based URL builder
 */

/**
 * Mapping of capture group names to their regex group indices
 * Example: { "owner": 1, "repo": 2 }
 */
export interface GitProviderCaptures {
  [key: string]: number;
}

/**
 * Configuration for a single git provider
 */
export interface GitProviderConfig {
  /** Human-readable name of the provider (for logging/debugging) */
  name: string;
  
  /** Regex pattern to match remote URL (with capture groups) */
  remote_url_pattern: string;
  
  /** Template for file URLs */
  file_url_template: string;
  
  /** Template for directory URLs */
  directory_url_template: string;
  
  /** Template for single line number fragment */
  line_fragment_single: string;
  
  /** Template for line range fragment */
  line_fragment_range: string;
  
  /** Template for PR/MR list URLs (optional) */
  pr_list_url_template?: string;
  
  /** Template for compare URLs (optional) */
  compare_url_template?: string;
  
  /** Template for commit URLs (optional) */
  commit_url_template?: string;
  
  /** Template for file-specific commit URLs with line number (optional) */
  commit_file_url_template?: string;
  
  /** Mapping of capture group names to indices */
  captures: GitProviderCaptures;
}

/**
 * Settings section of git provider config
 */
export interface GitProviderSettings {
  /** Order in which providers are checked (optional) */
  provider_check_order?: string[];
  
  /** Whether to use built-in providers as fallback */
  use_builtin_fallback?: boolean;
}

/**
 * Complete git provider configuration from TOML file
 */
export interface GitProvidersConfig {
  /** Map of provider ID to provider configuration */
  git_provider: {
    [providerId: string]: GitProviderConfig;
  };
  
  /** Optional settings */
  settings?: GitProviderSettings;
}

/**
 * Template context for git URL building
 * Contains both captured variables and standard variables
 */
export interface GitTemplateContext {
  /** Variables extracted from remote URL pattern captures */
  [key: string]: string | number | undefined;
  
  /** Current branch name */
  branch?: string;
  
  /** Path relative to repository root */
  relative_path?: string;
  
  /** Start line number (for files only) */
  line_start?: number;
  
  /** End line number (for files only) */
  line_end?: number;
  
  /** Base branch for comparison */
  base_branch?: string;
  
  /** Current branch for comparison */
  current_branch?: string;
  
  /** Commit SHA (for commit URLs) */
  commit_sha?: string;
  
  /** File hash for commit diff fragments (SHA256 for GitHub/GitLab) */
  commit_file_hash?: string;
  
  /** File path for commit fragments (used by Stash/Bitbucket) */
  commit_file_path?: string;
  
  /** Line number in the file for commit URLs */
  commit_line_number?: number;
}
