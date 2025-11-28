# Change Log


## [3.2.1] - published

Fix License

## [3.2.0] - published

Published on Visualstudio marketplace.
https://marketplace.visualstudio.com/items?itemName=f34nk.open-in-browser-v2&ssr=false#overview

### New Features

#### File-Specific Commit URLs with Line Numbers 🎯
- **Open Commit Under Cursor** (`Shift+Alt+G`): Opens the git commit that last modified the current line
- **Direct file navigation**: Commit URLs now link directly to the changed file's diff with the line highlighted
- **Provider support**: Works with GitHub, GitLab, Stash, and custom providers
- **Smart fallback**: Falls back to basic commit URL if provider doesn't support file-specific URLs
- **Configurable**: `open-in-browser.commitUrlIncludeFile` setting to enable/disable feature

Example:
```
Before: https://github.com/user/repo/commit/abc1234 (shows all changed files)
After:  https://github.com/user/repo/commit/abc1234#diff-7ae45ad...L22 (scrolls to file, highlights line 22)
```

### Template Variables

New variables for commit URL templates:
- `${commit_sha}` - Commit SHA (40 characters)
- `${commit_file_hash}` - SHA256 hash of file path (GitHub/GitLab)
- `${commit_file_path}` - File path for fragments (Stash)
- `${commit_line_number}` - Line number in the file

### Configuration

```json
{
  "open-in-browser.commitUrlIncludeFile": true
}
```

### Technical Changes

- **Added**: `computeSHA256Hash()` function for file diff fragments
- **Added**: `buildCommitFileUrl()` method to `DynamicUrlBuilder`
- **Updated**: All built-in providers with `commit_file_url_template`
- **Updated**: `openCommitUnderCursor()` command to use file-specific URLs
- **Updated**: `TemplateContext` interface with commit file variables

## [3.1.0]

### Major Features

#### Configurable URL Builder with TOML Support 🎨
- **Custom git providers**: Define your own git provider URL patterns via TOML configuration
- **Template-based URLs**: Use `${variable}` syntax for flexible URL construction
- **Hot reload**: Configuration changes are automatically detected and reloaded
- **Multiple config locations**: Workspace, user, or custom path configurations
- **Graceful fallback**: Always falls back to built-in providers if custom config fails
- **Zero-code customization**: No need to modify extension code for custom providers

#### New Provider Management Commands
- **Generate Provider Config Template**: Creates `.cursor/open-in-browser-providers.toml` with defaults
- **Reload Provider Config**: Hot-reload configuration without restarting VS Code
- **Show Detected Provider**: Debug tool showing matched provider and sample URLs

### Configuration File Format

TOML-based provider configuration supports:
- Custom remote URL patterns (regex)
- File and directory URL templates
- Line number formatting (single line and ranges)
- PR/MR list URL templates
- Branch comparison URL templates
- Custom variable extraction from remote URLs

Example TOML configuration:
```toml
[provider.CUSTOM_GIT]
name = "My Custom Git"
remote_url_pattern = "^git@custom\\.com:(.+)/(.+)\\.git$"
file_url_template = "https://custom.com/${owner}/${repo}/blob/${branch}/${relative_path}"
directory_url_template = "https://custom.com/${owner}/${repo}/tree/${branch}/${relative_path}"
line_fragment_single = "#L${line_start}"
line_fragment_range = "#L${line_start}-L${line_end}"
pr_list_url_template = "https://custom.com/${owner}/${repo}/pulls"
compare_url_template = "https://custom.com/${owner}/${repo}/compare/${base_branch}...${current_branch}"

[provider.CUSTOM_GIT.captures]
owner = 1
repo = 2
```

### Configuration File Locations

Priority order (first found wins):
1. Workspace setting: `open-in-browser.providerConfigPath`
2. Workspace file: `.cursor/open-in-browser-providers.toml`
3. User setting: `open-in-browser.providerConfigPath`
4. User file: `~/.config/vscode-open-in-browser/providers.toml`
5. Built-in defaults

### New Configuration Settings

```json
{
  "open-in-browser.providerConfigPath": "",
  "open-in-browser.useBuiltinProviders": true
}
```

### Template Variables

Available variables for URL templates:
- `${owner}`, `${repo}`, `${org}`, `${project}` - Repository identifiers (from captures)
- `${branch}` - Current branch name
- `${relative_path}` - File/directory path relative to repository root
- `${line_start}`, `${line_end}` - Line numbers for file links
- `${base_branch}`, `${current_branch}` - Branches for comparison URLs

### Technical Changes

- **New modules**:
  - `src/providerConfig.ts` - TypeScript type definitions for provider configuration
  - `src/defaultProviders.ts` - Built-in provider configs in TOML format
  - `src/templateEngine.ts` - Template variable substitution engine
  - `src/configLoader.ts` - Configuration file search, loading, parsing, and watching
  - `src/dynamicUrlBuilder.ts` - Dynamic URL building based on TOML config
- **Removed modules**:
  - `src/urlBuilder.ts` - Replaced by configurable dynamic URL builder
- **Dependencies**: Added `@iarna/toml` for TOML parsing
- **TypeScript target**: Updated to ES2017 for `Object.entries` support
- **Architecture**: All URL building now flows through configurable template system

### Improvements

- **Enterprise-ready**: Organizations can define custom git provider patterns
- **No code changes needed**: URL patterns fully configurable without touching extension code
- **File watching**: Config file changes automatically trigger reload
- **Better error messages**: Clear feedback when config is invalid or providers don't match
- **Debug tools**: New commands to inspect and troubleshoot provider configuration

## [3.0.0]

### Major Features

#### Git-Aware Browser Opening
- **Automatic git provider detection**: Opens files in GitHub, GitLab, or Stash web interface
- **Smart URL building**: Detects git remote URL and constructs proper web interface links
- **Fallback support**: Opens local `file://` URLs for non-git files
- **Configuration option**: `open-in-browser.preferGitUrl` to enable/disable git URLs

#### Line Number Support
- **Cursor position**: Opens files at the current cursor line in git provider
- **Selection ranges**: Opens files with selected line range highlighted
- **Provider-specific formatting**: Correctly formats line numbers for each git provider
- **Configuration option**: `open-in-browser.includeLineNumbers` to enable/disable line numbers

#### Terminal Directory Support
- **Terminal detection**: Automatically detects when terminal is focused
- **Current working directory**: Opens terminal's cwd in browser or git web interface
- **Multi-platform support**: Works on macOS, Linux, and Windows
- **Shell integration**: Uses VS Code shell integration when available for faster detection
- **Process-based fallback**: Uses OS-specific commands (`lsof`, `pwdx`, PowerShell) when shell integration unavailable
- **Configuration options**: 
  - `open-in-browser.enableTerminalSupport` to enable/disable terminal support
  - `open-in-browser.terminalFallbackToWorkspace` to fallback to workspace root

### New Commands

#### Copy Remote URL (`Shift+Alt+C`)
- **Copy to clipboard**: Copies git provider URL or local file URL to clipboard
- **Works with all features**: Includes line numbers and git detection
- **User feedback**: Shows notification with URL preview after copying
- **No browser opening**: Quick way to get shareable links without opening browser

#### Open PR List (`Shift+Alt+P`)
- **Quick PR access**: Opens pull request/merge request list page for current repository
- **Provider support**: Works for GitHub
- **Context aware**: Works from editor files and terminal directories
- **Smart URL building**: Automatically constructs provider-specific PR list URLs

#### Open Jira Ticket (`Shift+Alt+J`)
- **Branch name parsing**: Extracts Jira ticket number from branch name (e.g., OX-2615)
- **Direct ticket access**: Opens ticket in Jira web interface
- **Configurable base URL**: Supports custom Jira instance URLs
- **Context aware**: Works from editor files and terminal directories

#### Open Compare URL (`Shift+Alt+M`)
- **Branch comparison**: Opens git provider's compare page for current branch vs. base branch
- **Auto-detect base branch**: Automatically finds main/master or uses configured default
- **All providers**: Supports GitHub, GitLab, and Stash
- **Smart validation**: Prevents opening when already on base branch
- **Context aware**: Works from editor files and terminal directories

### Improvements

- **Context menu visibility**: All commands now appear for all file types (not just HTML)
- **Editor priority**: Editor always takes priority over terminal when both are active
- **Directory support**: Git URL builders now support directories (not just files)
- **Smart detection**: Automatically chooses between file, directory, and terminal context
- **Error handling**: Graceful fallbacks with user-friendly error messages
- **Updated VS Code engine**: Requires VS Code 1.30+ for clipboard API support

### Bug Fixes

- Fixed: Extension now correctly opens files when editor is active (editor takes priority over terminal)
- Fixed: Directory URLs no longer include line number fragments
- Fixed: Empty relative path (repository root) now handled correctly
- Fixed: Symlinks are resolved to real paths in terminal detection

### Technical Changes

- **New modules**: 
  - `src/git.ts` - Git detection and repository information
  - `src/urlBuilder.ts` - URL construction for each git provider
  - `src/terminal.ts` - Terminal detection and current directory resolution
- **Updated dependencies**: `@types/vscode` updated to 1.30.0
- **Code refactoring**: Shared helper functions for URL building and path detection
- **TypeScript compilation**: All new code properly typed with no linter errors

### Configuration

New settings available:

```json
{
  "open-in-browser.preferGitUrl": true,
  "open-in-browser.includeLineNumbers": true,
  "open-in-browser.enableTerminalSupport": true,
  "open-in-browser.terminalFallbackToWorkspace": true,
  "open-in-browser.gitTimeout": 5000,
  "open-in-browser.jiraBaseUrl": "https://atlassian.net/browse",
  "open-in-browser.defaultBaseBranch": "main"
}
```
