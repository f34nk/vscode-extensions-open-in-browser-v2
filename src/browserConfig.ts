/**
 * Browser configuration types
 */

export interface BrowserConfig {
  /** Display label in VS Code quick pick */
  label: string;
  
  /** Description shown in quick pick */
  description: string;
  
  /** Executable name for Windows */
  executable_windows?: string;
  
  /** Executable name for macOS */
  executable_macos?: string;
  
  /** Executable name for Linux */
  executable_linux?: string;
  
  /** Aliases that match this browser (case-insensitive) */
  aliases: string[];
  
  /** Platforms where this browser is available */
  platforms?: string[];  // ["windows", "macos", "linux"]
  
  /** Custom executable path (overrides platform defaults) */
  custom_path_windows?: string;
  custom_path_macos?: string;
  custom_path_linux?: string;
  
  /** Launch arguments to pass to browser */
  launch_args?: string[];
  
  /** Icon identifier (for future use) */
  icon?: string;
}

export interface BrowserSettings {
  /** Order browsers appear in picker */
  browser_order?: string[];
  
  /** Use built-in browsers as fallback */
  use_builtin_fallback?: boolean;
  
  /** Filter browsers by current platform */
  filter_by_platform?: boolean;
}

export interface BrowsersConfig {
  /** Map of browser ID to browser configuration */
  browser: {
    [browserId: string]: BrowserConfig;
  };
  
  /** Optional settings */
  settings?: BrowserSettings;
}

/**
 * Resolved browser for use in the application
 */
export interface ResolvedBrowser {
  id: string;
  label: string;
  description: string;
  executable: string;  // Platform-appropriate executable
  aliases: string[];
  launch_args: string[];
  custom_path?: string;
}




