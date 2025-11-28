import { APP_NAME } from './constants';
import { getBrowserConfigLoader } from './extension';
import * as vscode from 'vscode';

const open = require('open');

/**
 * Get standardized browser name (async)
 * @param name Browser name or alias
 * @returns Standardized browser executable name or null if not found
 */
export const standardizedBrowserName = async (name: string = ''): Promise<string | null> => {
  if (!name) {
    return null;
  }

  const loader = getBrowserConfigLoader();
  const browser = await loader.findBrowser(name);
  
  return browser ? browser.executable : null;
};

/**
 * get default browser name
 */
export const defaultBrowser = (): string => {
  const config = vscode.workspace.getConfiguration(APP_NAME);
  return config ? config.default : '';
};

export const openUrl = (pathOrUrl: string, browser: string = '') => {
  if (!pathOrUrl) {
    vscode.window.showErrorMessage('No file to open. Please save the file first.');
    return;
  }

  // Convert file path to file:// URL if it's not already a URL
  let url = pathOrUrl;
  if (!pathOrUrl.startsWith('http://') && !pathOrUrl.startsWith('https://') && !pathOrUrl.startsWith('file://')) {
    url = 'file://' + pathOrUrl;
  }

  // Prepare options for open package
  // The 'open' package uses 'app' option with different format
  const options: any = {};
  if (browser) {
    // For open v8.x, app can be a string or object with name
    options.app = { name: browser };
  }
  
  open(url, options)
    .catch((err: any) => {
      // If the specified browser fails, try without specifying an app (system default)
      if (browser) {
        open(url, {})
          .catch((_: any) => {
            vscode.window.showErrorMessage(`Open browser failed!! Please check if you have installed the browser ${browser} correctly!`);
          });
      } else {
        vscode.window.showErrorMessage(`Open browser failed!`);
      }
    });
};
