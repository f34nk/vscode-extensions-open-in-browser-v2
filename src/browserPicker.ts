/**
 * Browser picker utilities for VS Code UI
 */

import { QuickPickItem } from "vscode";
import { ResolvedBrowser } from './browserConfig';

/**
 * QuickPick item for browser selection
 */
export interface BrowserPickItem extends QuickPickItem {
  /** Browser executable name */
  standardName: string;
  /** Aliases that match this browser */
  acceptName: string[];
}

/**
 * Convert ResolvedBrowser to QuickPickItem format
 * @param browser Resolved browser configuration
 * @returns Browser as QuickPickItem for VS Code picker
 */
export function browserToPickItem(browser: ResolvedBrowser): BrowserPickItem {
  return {
    label: browser.label,
    description: browser.description,
    detail: `Aliases: ${browser.aliases.join(', ')}`,
    standardName: browser.executable,
    acceptName: browser.aliases
  };
}

/**
 * Convert array of browsers to QuickPickItems
 * @param browsers Array of resolved browsers
 * @returns Array of browser pick items
 */
export function browsersToPickItems(browsers: ResolvedBrowser[]): BrowserPickItem[] {
  return browsers.map(browserToPickItem);
}
