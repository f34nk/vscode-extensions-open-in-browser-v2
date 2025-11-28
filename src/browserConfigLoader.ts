/**
 * Browser configuration loader
 * Loads and merges browser configurations from TOML files
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as toml from '@iarna/toml';
import { BrowsersConfig, ResolvedBrowser, BrowserConfig } from './browserConfig';
import { DEFAULT_BROWSERS_TOML } from './defaultBrowsers';
import { APP_NAME } from './constants';

export class BrowserConfigLoader {
  private cachedConfig: BrowsersConfig | null = null;
  private configPaths: string[] = [];
  private fileWatchers: vscode.FileSystemWatcher[] = [];
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Open in Browser - Browsers');
  }

  /**
   * Log message to output channel
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  /**
   * Resolve path handling absolute, relative, and tilde paths
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
   * Search for browser config files in priority order
   */
  private async searchConfigPaths(): Promise<string[]> {
    const config = vscode.workspace.getConfiguration(APP_NAME);
    const paths: string[] = [];
    
    // 1. Check workspace setting
    const inspection = config.inspect<string[]>('browserConfigPaths');
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
        '.vscode/browsers.toml',
        '.cursor/browsers.toml'
      ];
      
      for (const conventionFile of conventionFiles) {
        const workspaceFile = path.join(workspaceFolders[0].uri.fsPath, conventionFile);
        if (!paths.includes(workspaceFile)) {
          paths.push(workspaceFile);
        }
      }
    }
    
    // 3. Check user setting
    const userConfigPaths = inspection?.globalValue || [];
    for (const configPath of userConfigPaths) {
      const resolved = this.resolvePath(configPath, false);
      if (!paths.includes(resolved)) {
        paths.push(resolved);
      }
    }
    
    // 4. Check user convention file
    const userFile = path.join(os.homedir(), '.config', 'vscode-open-in-browser', 'browsers.toml');
    if (!paths.includes(userFile)) {
      paths.push(userFile);
    }
    
    return paths;
  }

  /**
   * Parse TOML content into BrowsersConfig
   */
  private parseToml(content: string): BrowsersConfig {
    try {
      const parsed = toml.parse(content) as any;
      
      // Validate structure
      if (!parsed.browser || typeof parsed.browser !== 'object') {
        throw new Error('Config must have a [browser] section');
      }

      return parsed as BrowsersConfig;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse TOML: ${message}`);
    }
  }

  /**
   * Merge browser configurations
   */
  private mergeConfigs(base: BrowsersConfig, override: BrowsersConfig): BrowsersConfig {
    const merged: BrowsersConfig = {
      browser: { ...base.browser },
      settings: base.settings ? { ...base.settings } : undefined
    };

    // Merge browsers (browser-level replacement)
    for (const [browserId, browser] of Object.entries(override.browser)) {
      merged.browser[browserId] = { ...browser };
    }

    // Merge settings
    if (override.settings) {
      if (!merged.settings) {
        merged.settings = {};
      }

      if (override.settings.browser_order) {
        merged.settings.browser_order = [...override.settings.browser_order];
      }

      if (override.settings.use_builtin_fallback !== undefined) {
        merged.settings.use_builtin_fallback = override.settings.use_builtin_fallback;
      }

      if (override.settings.filter_by_platform !== undefined) {
        merged.settings.filter_by_platform = override.settings.filter_by_platform;
      }
    }

    // Ensure browser_order includes all browsers
    if (!merged.settings) {
      merged.settings = {};
    }

    if (!merged.settings.browser_order) {
      merged.settings.browser_order = Object.keys(merged.browser);
    } else {
      // Add any new browsers to the end of the order
      for (const browserId of Object.keys(merged.browser)) {
        if (!merged.settings.browser_order.includes(browserId)) {
          merged.settings.browser_order.push(browserId);
        }
      }
    }

    return merged;
  }

  /**
   * Load and merge multiple config files
   */
  private async loadMultipleConfigs(configPaths: string[]): Promise<BrowsersConfig | null> {
    const configs: BrowsersConfig[] = [];
    const loadedPaths: string[] = [];

    for (const configPath of configPaths) {
      try {
        if (this.fileExists(configPath)) {
          this.log(`Loading config from: ${configPath}`);
          const content = fs.readFileSync(configPath, 'utf-8');
          const config = this.parseToml(content);
          
          const browserIds = Object.keys(config.browser);
          this.log(`  Browsers in this config: ${browserIds.join(', ')}`);
          
          configs.push(config);
          loadedPaths.push(configPath);
          this.log(`Successfully loaded config from: ${configPath}`);
        } else {
          this.log(`Config path not found (skipping): ${configPath}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.log(`Error loading config from ${configPath}: ${message}`);
        
        vscode.window.showWarningMessage(
          `Failed to load browser config from ${configPath}: ${message}`
        );
      }
    }

    if (configs.length === 0) {
      this.log('No valid browser config files loaded');
      return null;
    }

    this.log(`Merging ${configs.length} browser config(s)...`);

    // Merge all loaded configs
    let merged = configs[0];
    for (let i = 1; i < configs.length; i++) {
      merged = this.mergeConfigs(merged, configs[i]);
    }

    // Store all loaded paths for watchers
    this.configPaths = loadedPaths;
    
    if (merged.settings?.browser_order) {
      this.log(`Final browser_order: ${merged.settings.browser_order.join(', ')}`);
    }

    return merged;
  }

  /**
   * Load configuration from file(s) or use built-in defaults
   */
  async loadConfig(): Promise<BrowsersConfig | null> {
    try {
      const config = vscode.workspace.getConfiguration(APP_NAME);
      
      // Get merge preference
      const alwaysMergeWithDefaults = config.get<boolean>('alwaysMergeWithDefaults', true);
      
      // Start with defaults if merging enabled
      let baseConfig: BrowsersConfig | null = null;
      if (alwaysMergeWithDefaults) {
        this.log('Starting with built-in default browsers');
        baseConfig = this.parseToml(DEFAULT_BROWSERS_TOML);
      }

      // Get config paths
      const configPaths = await this.searchConfigPaths();
      
      if (configPaths.length > 0) {
        this.log(`Found ${configPaths.length} browser config path(s) to check`);
        
        // Load and merge all configs
        const customConfig = await this.loadMultipleConfigs(configPaths);
        
        if (customConfig) {
          let finalConfig: BrowsersConfig;
          
          if (baseConfig) {
            finalConfig = this.mergeConfigs(baseConfig, customConfig);
            this.log('Merged custom config with built-in defaults');
          } else {
            finalConfig = customConfig;
            this.log('Using custom config without defaults');
          }
          
          this.cachedConfig = finalConfig;
          this.watchConfigs(this.configPaths);
          
          this.log(`Successfully loaded ${Object.keys(finalConfig.browser).length} browsers`);
          return finalConfig;
        } else {
          this.log('No valid custom configs found');
        }
      } else {
        this.log('No browser config paths specified');
      }
      
      // No custom configs - use defaults if available
      if (baseConfig) {
        this.log('Using built-in default browsers only');
        this.cachedConfig = baseConfig;
        return baseConfig;
      }
      
      // Load defaults as final fallback
      this.log('Loading built-in defaults as fallback');
      const fallbackConfig = this.parseToml(DEFAULT_BROWSERS_TOML);
      this.cachedConfig = fallbackConfig;
      return fallbackConfig;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Error in loadConfig: ${message}`);
      
      // Use built-in fallback
      const useBuiltinFallback = vscode.workspace
        .getConfiguration(APP_NAME)
        .get<boolean>('useBuiltinProviders', true);

      if (useBuiltinFallback) {
        this.log('Falling back to built-in browsers due to error');
        try {
          const fallbackConfig = this.parseToml(DEFAULT_BROWSERS_TOML);
          this.cachedConfig = fallbackConfig;
          return fallbackConfig;
        } catch (fallbackError) {
          this.log('Failed to load built-in browsers - this should not happen!');
          return null;
        }
      }

      vscode.window.showErrorMessage(
        `Failed to load browser config: ${message}`
      );
      return null;
    }
  }

  /**
   * Get current platform identifier
   */
  private getCurrentPlatform(): string {
    switch (process.platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'unknown';
    }
  }

  /**
   * Get executable name for current platform
   */
  private getExecutableForPlatform(browser: BrowserConfig, platform: string): string | undefined {
    switch (platform) {
      case 'windows':
        return browser.executable_windows;
      case 'macos':
        return browser.executable_macos;
      case 'linux':
        return browser.executable_linux;
      default:
        return undefined;
    }
  }

  /**
   * Get custom path for current platform
   */
  private getCustomPathForPlatform(browser: BrowserConfig, platform: string): string | undefined {
    switch (platform) {
      case 'windows':
        return browser.custom_path_windows;
      case 'macos':
        return browser.custom_path_macos;
      case 'linux':
        return browser.custom_path_linux;
      default:
        return undefined;
    }
  }

  /**
   * Resolve browsers for current platform
   */
  async getAvailableBrowsers(): Promise<ResolvedBrowser[]> {
    const config = await this.getConfig();
    if (!config) {
      return [];
    }

    const platform = this.getCurrentPlatform();
    const filterByPlatform = config.settings?.filter_by_platform ?? true;
    const browserOrder = config.settings?.browser_order || Object.keys(config.browser);

    const resolved: ResolvedBrowser[] = [];

    for (const browserId of browserOrder) {
      const browserConfig = config.browser[browserId];
      if (!browserConfig) continue;

      // Filter by platform if enabled
      if (filterByPlatform && browserConfig.platforms && browserConfig.platforms.length > 0) {
        if (!browserConfig.platforms.includes(platform)) {
          continue;
        }
      }

      // Get platform-specific executable
      const executable = this.getExecutableForPlatform(browserConfig, platform);
      if (!executable) {
        continue;
      }

      // Get custom path if specified
      const customPath = this.getCustomPathForPlatform(browserConfig, platform);

      resolved.push({
        id: browserId,
        label: browserConfig.label,
        description: browserConfig.description,
        executable,
        aliases: browserConfig.aliases || [],
        launch_args: browserConfig.launch_args || [],
        custom_path: customPath
      });
    }

    return resolved;
  }

  /**
   * Find browser by name or alias
   */
  async findBrowser(nameOrAlias: string): Promise<ResolvedBrowser | null> {
    const browsers = await this.getAvailableBrowsers();
    const normalized = nameOrAlias.toLowerCase().trim();

    for (const browser of browsers) {
      // Check aliases
      if (browser.aliases.some(alias => alias.toLowerCase() === normalized)) {
        return browser;
      }
      
      // Check ID
      if (browser.id.toLowerCase() === normalized) {
        return browser;
      }
      
      // Check label
      if (browser.label.toLowerCase() === normalized) {
        return browser;
      }
    }

    return null;
  }

  /**
   * Watch multiple config files for changes
   */
  private watchConfigs(filePaths: string[]): void {
    // Dispose all existing watchers
    this.disposeWatchers();
    
    this.fileWatchers = [];
    
    for (const filePath of filePaths) {
      try {
        const pattern = new vscode.RelativePattern(
          path.dirname(filePath),
          path.basename(filePath)
        );
        
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        // Reload on change
        watcher.onDidChange(async () => {
          this.log(`Browser config file changed: ${filePath}, reloading...`);
          const config = await this.reloadConfig();
          if (config) {
            vscode.window.showInformationMessage('Browser configuration reloaded');
          }
        });
        
        // Reload on delete
        watcher.onDidDelete(async () => {
          this.log(`Browser config file deleted: ${filePath}, reloading...`);
          await this.reloadConfig();
        });
        
        // Reload on create
        watcher.onDidCreate(async () => {
          this.log(`Browser config file created: ${filePath}, reloading...`);
          await this.reloadConfig();
        });
        
        this.fileWatchers.push(watcher);
        this.log(`Watching browser config file: ${filePath}`);
      } catch (error) {
        this.log(`Failed to watch browser config file: ${filePath}`);
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
   */
  async getConfig(): Promise<BrowsersConfig | null> {
    if (!this.cachedConfig) {
      return await this.loadConfig();
    }
    return this.cachedConfig;
  }

  /**
   * Force reload configuration
   */
  async reloadConfig(): Promise<BrowsersConfig | null> {
    this.cachedConfig = null;
    return await this.loadConfig();
  }

  /**
   * Get paths to currently loaded config files
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
