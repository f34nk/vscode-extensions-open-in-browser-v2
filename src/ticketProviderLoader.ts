import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as toml from '@iarna/toml';
import { TicketProvidersConfig } from './ticketProviderConfig';
import { DEFAULT_TICKET_PROVIDERS_TOML } from './defaultTicketProviders';

export class TicketProviderLoader {
  private config: TicketProvidersConfig | null = null;
  private configPaths: string[] = [];
  private fileWatchers: vscode.FileSystemWatcher[] = [];
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Load ticket provider configuration
   */
  async loadConfig(): Promise<TicketProvidersConfig | null> {
    this.outputChannel.appendLine('Loading ticket provider configuration...');
    
    // Search for config files
    const paths = await this.searchConfigPaths();
    
    if (paths.length === 0) {
      this.outputChannel.appendLine('No custom config files found, using built-in defaults');
      
      // No config files found, use built-in defaults
      return this.parseToml(DEFAULT_TICKET_PROVIDERS_TOML);
    }
    
    // Load and merge multiple configs
    const merged = await this.loadMultipleConfigs(paths);
    
    // Set up file watchers
    this.watchConfigs(paths);
    
    this.config = merged;
    this.configPaths = paths;
    
    return merged;
  }

  /**
   * Search for ticket provider config files
   */
  private async searchConfigPaths(): Promise<string[]> {
    const paths: string[] = [];
    
    // 1. Check workspace setting
    const workspaceConfig = vscode.workspace.getConfiguration('open-in-browser');
    const workspaceConfigPath = workspaceConfig.get<string>('ticketProviderConfigPath');
    
    if (workspaceConfigPath) {
      const resolvedPath = this.resolvePath(workspaceConfigPath);
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        this.outputChannel.appendLine(`Found config via setting: ${resolvedPath}`);
        paths.push(resolvedPath);
      }
    }
    
    // 2. Check workspace convention: .cursor/open-in-browser-tickets.toml
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const wsPath = path.join(workspaceFolders[0].uri.fsPath, '.cursor', 'open-in-browser-tickets.toml');
      if (fs.existsSync(wsPath)) {
        this.outputChannel.appendLine(`Found workspace config: ${wsPath}`);
        paths.push(wsPath);
      }
    }
    
    // 3. Check user home: ~/.config/vscode-open-in-browser/tickets.toml
    const homeDir = os.homedir();
    const userPath = path.join(homeDir, '.config', 'vscode-open-in-browser', 'tickets.toml');
    if (fs.existsSync(userPath)) {
      this.outputChannel.appendLine(`Found user config: ${userPath}`);
      paths.push(userPath);
    }
    
    return paths;
  }

  /**
   * Resolve path (handle ~, relative paths, etc.)
   */
  private resolvePath(configPath: string): string | null {
    if (!configPath) {
      return null;
    }

    // Handle home directory
    if (configPath.startsWith('~')) {
      return path.join(os.homedir(), configPath.slice(1));
    }

    // Handle absolute paths
    if (path.isAbsolute(configPath)) {
      return configPath;
    }

    // Handle workspace-relative paths
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return path.join(workspaceFolders[0].uri.fsPath, configPath);
    }

    return null;
  }

  /**
   * Load and merge multiple config files
   */
  private async loadMultipleConfigs(filePaths: string[]): Promise<TicketProvidersConfig | null> {
    let merged: TicketProvidersConfig = {
      ticket_provider: {}
    };

    // Start with built-in defaults
    const builtinConfig = this.parseToml(DEFAULT_TICKET_PROVIDERS_TOML);
    if (builtinConfig) {
      merged = builtinConfig;
      this.outputChannel.appendLine('Starting with built-in default providers:');
      this.outputChannel.appendLine(`  Providers: ${Object.keys(merged.ticket_provider).join(', ')}`);
    }

    // Merge each config file
    for (const filePath of filePaths) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = this.parseToml(content);
        
        if (parsed) {
          this.outputChannel.appendLine(`\nMerging config from: ${filePath}`);
          this.outputChannel.appendLine(`  Custom providers: ${Object.keys(parsed.ticket_provider).join(', ')}`);
          merged = this.mergeConfigs(merged, parsed);
        }
      } catch (error) {
        this.outputChannel.appendLine(`Error loading config from ${filePath}: ${error}`);
      }
    }

    this.outputChannel.appendLine(`\nFinal configuration:`);
    this.outputChannel.appendLine(`  Total providers: ${Object.keys(merged.ticket_provider).length}`);
    this.outputChannel.appendLine(`  Provider IDs: ${Object.keys(merged.ticket_provider).join(', ')}`);
    if (merged.settings?.check_order) {
      this.outputChannel.appendLine(`  Check order: ${merged.settings.check_order.join(', ')}`);
    }

    return merged;
  }

  /**
   * Merge two ticket provider configs
   * Automatically adds custom providers to check_order if not explicitly set
   */
  private mergeConfigs(base: TicketProvidersConfig, override: TicketProvidersConfig): TicketProvidersConfig {
    const merged: TicketProvidersConfig = {
      ticket_provider: { ...base.ticket_provider },
      settings: base.settings ? { ...base.settings } : undefined
    };

    // Track new provider IDs from override
    const newProviderIds: string[] = [];

    // Merge providers (provider-level replacement)
    for (const [providerId, provider] of Object.entries(override.ticket_provider)) {
      // Complete replacement of provider
      merged.ticket_provider[providerId] = { ...provider };
      
      // Track if this is a new provider (not in base)
      if (!(providerId in base.ticket_provider)) {
        newProviderIds.push(providerId);
        this.outputChannel.appendLine(`  New custom provider: ${providerId}`);
      }
    }

    // Merge settings (field-level)
    if (override.settings) {
      if (!merged.settings) {
        merged.settings = {};
      }

      // Merge each setting field
      if (override.settings.check_order) {
        merged.settings.check_order = [...override.settings.check_order];
      }

      if (override.settings.default_provider !== undefined) {
        merged.settings.default_provider = override.settings.default_provider;
      }

      if (override.settings.use_builtin_fallback !== undefined) {
        merged.settings.use_builtin_fallback = override.settings.use_builtin_fallback;
      }
    }

    // Ensure check_order includes all providers
    if (!merged.settings) {
      merged.settings = {};
    }

    if (!merged.settings.check_order) {
      // No check order specified, create one with all provider IDs
      merged.settings.check_order = Object.keys(merged.ticket_provider);
      this.outputChannel.appendLine(`  Auto-generated check_order: ${merged.settings.check_order.join(', ')}`);
    } else {
      // Add any new providers to the beginning of the check order (higher priority)
      const currentOrder = merged.settings.check_order;
      for (const providerId of newProviderIds) {
        if (!currentOrder.includes(providerId)) {
          currentOrder.unshift(providerId);  // Add to beginning for higher priority
          this.outputChannel.appendLine(`  Added ${providerId} to beginning of check_order`);
        }
      }
      
      // Also ensure all providers are in the order (defensive)
      for (const providerId of Object.keys(merged.ticket_provider)) {
        if (!currentOrder.includes(providerId)) {
          currentOrder.push(providerId);
          this.outputChannel.appendLine(`  Added ${providerId} to end of check_order`);
        }
      }
    }

    this.outputChannel.appendLine(`  Final check_order: ${merged.settings.check_order.join(', ')}`);

    return merged;
  }

  /**
   * Parse TOML string
   */
  private parseToml(content: string): TicketProvidersConfig | null {
    try {
      return toml.parse(content) as any as TicketProvidersConfig;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to parse ticket provider TOML: ${error}`);
      return null;
    }
  }

  /**
   * Get loaded config
   */
  getConfig(): TicketProvidersConfig | null {
    return this.config;
  }

  /**
   * Get loaded config paths
   */
  getConfigPaths(): string[] {
    return this.configPaths;
  }

  /**
   * Watch config files for changes
   */
  private watchConfigs(filePaths: string[]): void {
    // Dispose existing watchers
    this.disposeWatchers();
    
    // Create new watchers
    for (const filePath of filePaths) {
      try {
        const pattern = new vscode.RelativePattern(path.dirname(filePath), path.basename(filePath));
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        watcher.onDidChange(() => {
          this.outputChannel.appendLine(`Config file changed: ${filePath}`);
          this.loadConfig();
        });
        watcher.onDidCreate(() => {
          this.outputChannel.appendLine(`Config file created: ${filePath}`);
          this.loadConfig();
        });
        watcher.onDidDelete(() => {
          this.outputChannel.appendLine(`Config file deleted: ${filePath}`);
          this.loadConfig();
        });
        
        this.fileWatchers.push(watcher);
      } catch (error) {
        this.outputChannel.appendLine(`Error creating watcher for ${filePath}: ${error}`);
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
   * Dispose loader
   */
  dispose(): void {
    this.disposeWatchers();
  }
}
