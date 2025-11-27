/**
 * Configuration loader for TOML-based provider configs
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as toml from '@iarna/toml';
import { ProvidersConfig } from './providerConfig';
import { DEFAULT_PROVIDERS_TOML } from './defaultProviders';
import Config from './config';

/**
 * Configuration loader class
 * Handles searching, loading, parsing, and watching provider config files
 */
export class ConfigLoader {
  private cachedConfig: ProvidersConfig | null = null;
  private configPaths: string[] = [];
  private fileWatchers: vscode.FileSystemWatcher[] = [];
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Open in Browser - Providers');
  }

  /**
   * Log message to output channel
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  /**
   * Resolve path handling absolute, relative, and tilde paths
   * @param configPath Path from settings
   * @param isWorkspaceSetting Whether this came from workspace settings
   * @returns Resolved absolute path
   */
  private resolvePath(configPath: string, isWorkspaceSetting: boolean): string {
    // Handle tilde expansion
    if (configPath.startsWith('~/') || configPath.startsWith('~\\')) {
      return path.join(os.homedir(), configPath.substring(2));
    }

    // Handle absolute paths
    if (path.isAbsolute(configPath)) {
      return configPath;
    }

    // Handle relative paths
    if (isWorkspaceSetting) {
      // Relative to workspace root
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        return path.join(workspaceFolders[0].uri.fsPath, configPath);
      }
    }

    // Relative to home directory (for user settings)
    return path.join(os.homedir(), configPath);
  }

  /**
   * Check if file exists
   */
  private fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (error) {
      return false;
    }
  }

  /**
   * Search for all config paths to check (in priority order)
   * Includes backward compatibility for deprecated single-path setting
   * @returns Array of resolved config file paths
   */
  private async searchConfigPaths(): Promise<string[]> {
    const config = vscode.workspace.getConfiguration(Config.app);
    const paths: string[] = [];

    // 1. Check new array-based setting (workspace)
    const inspection = config.inspect<string[]>('providerConfigPaths');
    const workspaceConfigPaths = inspection?.workspaceValue || [];
    
    for (const configPath of workspaceConfigPaths) {
      const resolved = this.resolvePath(configPath, true);
      if (!paths.includes(resolved)) {
        paths.push(resolved);
      }
    }

    // 2. Check workspace convention files
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const conventionFiles = [
        '.vscode/git-providers.toml',
        '.cursor/open-in-browser-providers.toml'
      ];
      
      for (const conventionFile of conventionFiles) {
        const workspaceFile = path.join(workspaceFolders[0].uri.fsPath, conventionFile);
        if (!paths.includes(workspaceFile)) {
          paths.push(workspaceFile);
        }
      }
    }

    // 3. Check new array-based setting (user/global)
    const userConfigPaths = inspection?.globalValue || [];
    
    for (const configPath of userConfigPaths) {
      const resolved = this.resolvePath(configPath, false);
      if (!paths.includes(resolved)) {
        paths.push(resolved);
      }
    }
    
    // 4. Check user convention files
    const userConventionFiles = [
      path.join(os.homedir(), '.config', 'vscode-open-in-browser', 'providers.toml'),
      path.join(os.homedir(), '.vscode', 'open-in-browser-providers.toml')
    ];
    
    for (const userFile of userConventionFiles) {
      if (!paths.includes(userFile)) {
        paths.push(userFile);
      }
    }

    // 5. BACKWARD COMPATIBILITY: Check deprecated single-path setting
    const oldInspection = config.inspect<string>('providerConfigPath');
    
    // Workspace-level old setting
    const workspaceOldPath = oldInspection?.workspaceValue;
    if (workspaceOldPath && workspaceOldPath.trim() !== '') {
      const resolved = this.resolvePath(workspaceOldPath, true);
      if (!paths.includes(resolved)) {
        paths.push(resolved);
        this.log('Using deprecated providerConfigPath setting (workspace)');
        vscode.window.showWarningMessage(
          'The setting "open-in-browser.providerConfigPath" is deprecated. Please use "providerConfigPaths" (array) instead.',
          'OK'
        );
      }
    }
    
    // User-level old setting
    const userOldPath = oldInspection?.globalValue;
    if (userOldPath && userOldPath.trim() !== '') {
      const resolved = this.resolvePath(userOldPath, false);
      if (!paths.includes(resolved)) {
        paths.push(resolved);
        this.log('Using deprecated providerConfigPath setting (user)');
      }
    }
    
    return paths;
  }

  /**
   * Parse TOML content into ProvidersConfig
   * @param content TOML content string
   * @returns Parsed configuration
   */
  private parseToml(content: string): ProvidersConfig {
    try {
      const parsed = toml.parse(content) as any;
      
      // Validate structure
      if (!parsed.provider || typeof parsed.provider !== 'object') {
        throw new Error('Config must have a [provider] section');
      }

      return parsed as ProvidersConfig;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse TOML: ${message}`);
    }
  }

  /**
   * Validate provider configuration
   * @param config Configuration to validate
   */
  private validateConfig(config: ProvidersConfig): void {
    const requiredFields = [
      'name',
      'remote_url_pattern',
      'file_url_template',
      'directory_url_template',
      'line_fragment_single',
      'line_fragment_range',
      'captures'
    ];

    for (const [providerId, provider] of Object.entries(config.provider)) {
      for (const field of requiredFields) {
        if (!(field in provider)) {
          throw new Error(`Provider '${providerId}' missing required field: ${field}`);
        }
      }

      // Validate regex pattern
      try {
        new RegExp(provider.remote_url_pattern);
      } catch (error) {
        throw new Error(`Provider '${providerId}' has invalid regex pattern: ${provider.remote_url_pattern}`);
      }

      // Validate captures is an object
      if (typeof provider.captures !== 'object' || provider.captures === null) {
        throw new Error(`Provider '${providerId}' has invalid captures configuration`);
      }
    }
  }

  /**
   * Deep merge provider configurations
   * Later configs override earlier configs at the provider level
   * @param base Base configuration
   * @param override Override configuration
   * @returns Merged configuration
   */
  private mergeConfigs(base: ProvidersConfig, override: ProvidersConfig): ProvidersConfig {
    const merged: ProvidersConfig = {
      provider: { ...base.provider },
      settings: base.settings ? { ...base.settings } : undefined
    };

    // Track new provider IDs from override
    const newProviderIds: string[] = [];

    // Merge providers (provider-level replacement)
    for (const [providerId, provider] of Object.entries(override.provider)) {
      // Complete replacement of provider
      merged.provider[providerId] = { ...provider };
      
      // Track if this is a new provider (not in base)
      if (!(providerId in base.provider)) {
        newProviderIds.push(providerId);
      }
    }

    // Merge settings (field-level)
    if (override.settings) {
      if (!merged.settings) {
        merged.settings = {};
      }

      // Merge each setting field
      if (override.settings.provider_check_order) {
        merged.settings.provider_check_order = [...override.settings.provider_check_order];
      }

      if (override.settings.use_builtin_fallback !== undefined) {
        merged.settings.use_builtin_fallback = override.settings.use_builtin_fallback;
      }
    }

    // Ensure provider_check_order includes all providers
    if (!merged.settings) {
      merged.settings = {};
    }

    if (!merged.settings.provider_check_order) {
      // No check order specified, create one with all provider IDs
      merged.settings.provider_check_order = Object.keys(merged.provider);
    } else {
      // Add any new providers to the end of the check order
      const currentOrder = merged.settings.provider_check_order;
      for (const providerId of newProviderIds) {
        if (!currentOrder.includes(providerId)) {
          currentOrder.push(providerId);
        }
      }
      
      // Also ensure overridden providers are still in the order
      // (they should be, but let's be defensive)
      for (const providerId of Object.keys(merged.provider)) {
        if (!currentOrder.includes(providerId)) {
          currentOrder.push(providerId);
        }
      }
    }

    return merged;
  }

  /**
   * Log detailed merge information for debugging
   * @param base Base configuration
   * @param override Override configuration
   * @param merged Result of merge
   */
  private logMergeDetails(base: ProvidersConfig, override: ProvidersConfig, merged: ProvidersConfig): void {
    this.log('=== Configuration Merge ===');
    
    // Providers in base
    const baseProviders = Object.keys(base.provider);
    this.log(`Base providers (${baseProviders.length}): ${baseProviders.join(', ')}`);
    
    // Providers in override
    const overrideProviders = Object.keys(override.provider);
    this.log(`Override providers (${overrideProviders.length}): ${overrideProviders.join(', ')}`);
    
    // New providers added
    const newProviders = overrideProviders.filter(p => !baseProviders.includes(p));
    if (newProviders.length > 0) {
      this.log(`New providers added: ${newProviders.join(', ')}`);
    }
    
    // Providers overridden
    const overriddenProviders = overrideProviders.filter(p => baseProviders.includes(p));
    if (overriddenProviders.length > 0) {
      this.log(`Providers overridden: ${overriddenProviders.join(', ')}`);
    }
    
    // Final providers
    const mergedProviders = Object.keys(merged.provider);
    this.log(`Final merged providers (${mergedProviders.length}): ${mergedProviders.join(', ')}`);
    
    this.log('=== End Merge ===');
  }

  /**
   * Load and merge multiple config files
   * @param configPaths Array of config file paths to load
   * @returns Merged configuration or null
   */
  private async loadMultipleConfigs(configPaths: string[]): Promise<ProvidersConfig | null> {
    const configs: ProvidersConfig[] = [];
    const loadedPaths: string[] = [];

    for (const configPath of configPaths) {
      try {
        if (this.fileExists(configPath)) {
          this.log(`Loading config from: ${configPath}`);
          const content = fs.readFileSync(configPath, 'utf-8');
          const config = this.parseToml(content);
          
          // Log what providers are in this config
          const providerIds = Object.keys(config.provider);
          this.log(`  Providers in this config: ${providerIds.join(', ')}`);
          
          // Validate this config
          this.validateConfig(config);
          
          configs.push(config);
          loadedPaths.push(configPath);
          this.log(`Successfully loaded config from: ${configPath}`);
        } else {
          this.log(`Config path not found (skipping): ${configPath}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.log(`Error loading config from ${configPath}: ${message}`);
        
        // Show warning but continue with other files
        vscode.window.showWarningMessage(
          `Failed to load provider config from ${configPath}: ${message}`
        );
      }
    }

    if (configs.length === 0) {
      this.log('No valid config files loaded');
      return null;
    }

    this.log(`Merging ${configs.length} config(s)...`);

    // Merge all loaded configs
    let merged = configs[0];
    for (let i = 1; i < configs.length; i++) {
      this.logMergeDetails(merged, configs[i], this.mergeConfigs(merged, configs[i]));
      merged = this.mergeConfigs(merged, configs[i]);
    }

    // Store all loaded paths for watchers
    this.configPaths = loadedPaths;
    
    // Log final provider check order
    if (merged.settings?.provider_check_order) {
      this.log(`Final provider_check_order: ${merged.settings.provider_check_order.join(', ')}`);
    }

    return merged;
  }

  /**
   * Load configuration from file(s) or use built-in defaults
   * @returns Provider configuration or null if loading failed
   */
  async loadConfig(): Promise<ProvidersConfig | null> {
    try {
      const config = vscode.workspace.getConfiguration(Config.app);
      
      // Get merge preference
      const alwaysMergeWithDefaults = config.get<boolean>('alwaysMergeWithDefaults', true);
      
      // Start with defaults if merging enabled
      let baseConfig: ProvidersConfig | null = null;
      if (alwaysMergeWithDefaults) {
        this.log('Starting with built-in default providers');
        baseConfig = this.parseToml(DEFAULT_PROVIDERS_TOML);
      }

      // Get config paths (new array-based setting)
      const configPaths = await this.searchConfigPaths();

      if (configPaths.length > 0) {
        this.log(`Found ${configPaths.length} config path(s) to check`);
        
        // Load and merge all configs
        const customConfig = await this.loadMultipleConfigs(configPaths);
        
        if (customConfig) {
          let finalConfig: ProvidersConfig;
          
          if (baseConfig) {
            // Merge custom config with defaults
            this.logMergeDetails(baseConfig, customConfig, this.mergeConfigs(baseConfig, customConfig));
            finalConfig = this.mergeConfigs(baseConfig, customConfig);
            this.log('Merged custom config with built-in defaults');
          } else {
            // Use custom config only
            finalConfig = customConfig;
            this.log('Using custom config without defaults');
          }
          
          // Validate final merged configuration
          this.validateConfig(finalConfig);
          
          // Log final configuration summary
          this.log(`Successfully loaded ${Object.keys(finalConfig.provider).length} providers`);
          if (finalConfig.settings?.provider_check_order) {
            this.log(`Final provider_check_order: ${finalConfig.settings.provider_check_order.join(', ')}`);
          }
          if (finalConfig.settings?.use_builtin_fallback !== undefined) {
            this.log(`use_builtin_fallback: ${finalConfig.settings.use_builtin_fallback}`);
          }
          
          // Cache and watch
          this.cachedConfig = finalConfig;
          this.watchConfigs(this.configPaths);
          
          return finalConfig;
        } else {
          this.log('No valid custom configs found');
        }
      } else {
        this.log('No config paths specified');
      }
      
      // No custom configs - use defaults if available
      if (baseConfig) {
        this.log('Using built-in default providers only');
        this.cachedConfig = baseConfig;
        return baseConfig;
      }

      // Load defaults as final fallback
      this.log('Loading built-in defaults as fallback');
      const fallbackConfig = this.parseToml(DEFAULT_PROVIDERS_TOML);
      this.cachedConfig = fallbackConfig;
      return fallbackConfig;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Error in loadConfig: ${message}`);
      
      // Use built-in fallback if enabled
      const useBuiltinFallback = vscode.workspace
        .getConfiguration(Config.app)
        .get<boolean>('useBuiltinProviders', true);

      if (useBuiltinFallback) {
        this.log('Falling back to built-in providers due to error');
        try {
          const fallbackConfig = this.parseToml(DEFAULT_PROVIDERS_TOML);
          this.cachedConfig = fallbackConfig;
          return fallbackConfig;
        } catch (fallbackError) {
          this.log('Failed to load built-in providers - this should not happen!');
          return null;
        }
      }

      vscode.window.showErrorMessage(
        `Failed to load provider config: ${message}`
      );
      return null;
    }
  }

  /**
   * Watch multiple config files for changes
   * @param filePaths Array of config file paths to watch
   */
  private watchConfigs(filePaths: string[]): void {
    // Dispose all existing watchers
    this.disposeWatchers();
    
    this.fileWatchers = [];
    
    for (const filePath of filePaths) {
      try {
        // Create watcher for this file
    const pattern = new vscode.RelativePattern(
      path.dirname(filePath),
      path.basename(filePath)
    );

        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Reload on change
        watcher.onDidChange(async () => {
          this.log(`Config file changed: ${filePath}, reloading all configs...`);
          const config = await this.reloadConfig();
          if (config) {
            vscode.window.showInformationMessage(
              'Provider configuration reloaded'
            );
          }
        });
        
        // Reload on delete
        watcher.onDidDelete(async () => {
          this.log(`Config file deleted: ${filePath}, reloading...`);
          const config = await this.reloadConfig();
      if (config) {
        vscode.window.showInformationMessage(
          'Provider configuration reloaded'
        );
      }
    });

        // Reload on create (for initially missing files)
        watcher.onDidCreate(async () => {
          this.log(`Config file created: ${filePath}, reloading...`);
          const config = await this.reloadConfig();
      if (config) {
        vscode.window.showInformationMessage(
              'Provider configuration reloaded'
        );
      }
    });
        
        this.fileWatchers.push(watcher);
        this.log(`Watching config file: ${filePath}`);
      } catch (error) {
        this.log(`Failed to watch config file: ${filePath}`);
      }
    }
  }

  /**
   * Dispose all file watchers
   */
  private disposeWatchers(): void {
    for (const watcher of this.fileWatchers) {
      watcher.dispose();
    }
    this.fileWatchers = [];
  }

  /**
   * Get cached configuration (loads if not cached)
   * @returns Provider configuration
   */
  async getConfig(): Promise<ProvidersConfig | null> {
    if (!this.cachedConfig) {
      return await this.loadConfig();
    }
    return this.cachedConfig;
  }

  /**
   * Force reload configuration
   * @returns Reloaded provider configuration
   */
  async reloadConfig(): Promise<ProvidersConfig | null> {
    this.cachedConfig = null;
    return await this.loadConfig();
  }

  /**
   * Get paths to currently loaded config files
   * @returns Array of paths to config files (empty if using built-in defaults)
   */
  getConfigPaths(): string[] {
    return [...this.configPaths];
  }

  /**
   * Show output channel
   */
  showOutput(): void {
    this.outputChannel.show();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.disposeWatchers();
    this.outputChannel.dispose();
  }
}
