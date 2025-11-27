import { QuickPickItem, workspace } from "vscode";
import { BrowserConfigLoader } from './browserConfigLoader';
import { ResolvedBrowser } from './browserConfig';

// Legacy interface for backward compatibility
interface PickItem extends QuickPickItem {
  [propName: string]: any;
}

// Global browser config loader instance
let browserConfigLoader: BrowserConfigLoader | null = null;

/**
 * Get the browser configuration loader instance
 */
export function getBrowserConfigLoader(): BrowserConfigLoader {
  if (!browserConfigLoader) {
    browserConfigLoader = new BrowserConfigLoader();
  }
  return browserConfigLoader;
}

/**
 * Convert ResolvedBrowser to legacy PickItem format
 * For backward compatibility with existing code
 */
function browserToPickItem(browser: ResolvedBrowser): PickItem {
  return {
    label: browser.label,
    description: browser.description,
    detail: `Aliases: ${browser.aliases.join(', ')}`,
    standardName: browser.executable,
    acceptName: browser.aliases
  };
}

export default class Config {
  static app = 'open-in-browser';
  
  /**
   * Get available browsers as legacy PickItem array
   * @returns Array of browser items for quick pick
   */
  static async getBrowsers(): Promise<PickItem[]> {
    const loader = getBrowserConfigLoader();
    const browsers = await loader.getAvailableBrowsers();
    return browsers.map(browserToPickItem);
  }
  
  /**
   * Legacy browsers getter (for immediate synchronous access)
   * Returns empty array - code should use getBrowsers() instead
   * @deprecated Use Config.getBrowsers() async method instead
   */
  static get browsers(): PickItem[] {
    console.warn('Config.browsers is deprecated. Use Config.getBrowsers() instead.');
    return [];
  }
  
  /**
   * Get Jira base URL from configuration
   * Supports multiple formats for flexibility
   * @returns Base URL for Jira tickets (without trailing slash)
   */
  static getJiraBaseUrl(): string {
    const config = workspace.getConfiguration(Config.app);
    let baseUrl = config.get<string>('jiraBaseUrl', '');
    
    // If not configured, return empty string (feature disabled)
    if (!baseUrl) {
      return '';
    }
    
    // Remove trailing slash for consistency
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    return baseUrl;
  }
  
  /**
   * Get Jira ticket pattern from configuration
   * @returns Regex pattern for matching Jira tickets in branch names
   */
  static getJiraTicketPattern(): string {
    const config = workspace.getConfiguration(Config.app);
    // Default pattern: 2-5 uppercase letters, hyphen, 1-6 digits
    // Examples: OX-2615, PLAT-123, FE-1, JIRA-999999
    return config.get<string>('jiraTicketPattern', '[A-Z]{2,5}-[0-9]{1,6}');
  }
  
  /**
   * Check if Jira integration is enabled
   * @returns True if Jira base URL is configured
   */
  static isJiraEnabled(): boolean {
    return this.getJiraBaseUrl() !== '';
  }
}
