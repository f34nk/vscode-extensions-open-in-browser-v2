/**
 * Default built-in browser configurations
 * These are used when no custom config is found or as a fallback
 */

export const DEFAULT_BROWSERS_TOML = `# Browser Configuration
# Built-in browser definitions for Open in Browser extension

[browser.CHROME]
label = "Google Chrome"
description = "A fast, secure, and free web browser built for the modern web"
executable_windows = "chrome"
executable_macos = "google chrome"
executable_linux = "google-chrome"
aliases = ["chrome", "google chrome", "google-chrome", "gc"]
platforms = ["windows", "macos", "linux"]

[browser.FIREFOX]
label = "Mozilla Firefox"
description = "A fast, smart and personal web browser"
executable_windows = "firefox"
executable_macos = "firefox"
executable_linux = "firefox"
aliases = ["firefox", "ff", "mozilla firefox"]
platforms = ["windows", "macos", "linux"]

[browser.OPERA]
label = "Opera"
description = "A fast, secure, easy-to-use browser"
executable_windows = "opera"
executable_macos = "opera"
executable_linux = "opera"
aliases = ["opera"]
platforms = ["windows", "macos", "linux"]

[browser.SAFARI]
label = "Apple Safari"
description = "A fast, efficient browser on Mac"
executable_macos = "safari"
aliases = ["safari"]
platforms = ["macos"]

[browser.EDGE]
label = "Microsoft Edge"
description = "A modern browser based on Chromium"
executable_windows = "msedge"
executable_macos = "microsoft edge"
executable_linux = "microsoft-edge"
aliases = ["edge", "msedge", "microsoft edge"]
platforms = ["windows", "macos", "linux"]

[browser.IE]
label = "Internet Explorer"
description = "A legacy browser (deprecated)"
executable_windows = "iexplore"
aliases = ["ie", "iexplore"]
platforms = ["windows"]

[browser.CHROMIUM]
label = "Chromium"
description = "Open-source browser that Chrome is based on"
executable_macos = "chromium"
executable_linux = "chromium-browser"
aliases = ["chromium"]
platforms = ["macos", "linux"]

[browser.FIREFOX_DEVELOPER]
label = "Firefox Developer Edition"
description = "Firefox with developer tools"
executable_macos = "firefoxdeveloperedition"
executable_linux = "firefox-developer-edition"
aliases = ["firefox developer", "fde", "firefox developer edition"]
platforms = ["macos", "linux"]

[settings]
browser_order = ["CHROME", "FIREFOX", "EDGE", "SAFARI", "OPERA", "CHROMIUM", "FIREFOX_DEVELOPER", "IE"]
use_builtin_fallback = true
filter_by_platform = true
`;
