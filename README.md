# Open in Browser

A VS Code extension that opens files and directories in your browser or git provider's web interface.

## Features

### 🚀 Git-Aware Browser Opening

Automatically detects when your file is in a git repository and opens it in the corresponding web interface:

- **GitHub** (github.com)
- **GitLab** (gitlab.com)
- **Stash** (Atlassian Bitbucket Server)

For files not in git, opens as local `file://` URL in your browser.

### 📍 Line Number Support

Open files at specific locations:

- **Cursor position**: Opens file at the line where your cursor is
- **Line selection**: Opens file with selected lines highlighted
- **Line ranges**: Select multiple lines to create a range link

Example:
```
Cursor at line 42 → https://github.com/user/repo/tree/main/file.ts#L42
Lines 10-20 selected → https://github.com/user/repo/tree/main/file.ts#L10-L20
```

### 💻 Terminal Directory Support

Works with integrated terminal! When terminal is focused:

- Opens the terminal's current working directory
- Supports git repositories (opens directory in web interface)
- Supports non-git directories (opens local file:// URL)
- Works on macOS, Linux, and Windows

### 📋 Copy to Clipboard

Copy URLs instead of opening them:

- Press `Shift+Alt+C` to copy URL to clipboard
- Includes all features: git URLs, line numbers, directory paths
- Shows notification with URL preview

### 🔀 Pull Request Management

Quick access to PR/MR lists:

- Press `Shift+Alt+P` to open the repository's pull request list
- Works for GitHub
- Opens merge request list for GitLab (planned)

### 🎫 Jira Integration

Open Jira tickets from your branch:

- Press `Shift+Alt+J` to open Jira ticket from branch name
- Automatically extracts ticket number (e.g., `OX-2615`, `PROJ-123`)
- Configurable Jira base URL for your organization
- Works from any file or terminal in the repository

### 🔍 Branch Comparison

Compare branches on git providers:

- Press `Shift+Alt+M` to open compare page for current branch
- Automatically detects base branch (main/master)
- Creates comparison URL: `base...current-branch`
- Supports all git providers (GitHub, GitLab, Stash)
- Configurable default base branch

### 📝 Commit History Navigation

Open the commit that last modified a specific line:

- Press `Shift+Alt+G` to open the commit for the line under cursor
- **File-specific URLs**: Links directly to the changed file's diff with line highlighted
- **Quick context**: See exactly what changed in that commit
- Supports all git providers (GitHub, GitLab, Stash)
- Gracefully handles uncommitted changes

Example:
```
Cursor on line 22 → Opens commit scrolled to file diff, line 22 highlighted
```

### 🎨 Customizable Git Providers

Define your own git provider URL patterns with TOML configuration:

- **No code changes needed**: Configure URL patterns in TOML files
- **Template-based**: Use `${variable}` syntax for flexible URL construction
- **Hot reload**: Configuration changes automatically detected
- **Multiple locations**: Workspace, user, or custom path configurations
- **Enterprise-ready**: Perfect for private GitHub Enterprise, GitLab, or Bitbucket instances

#### Quick Start: Custom Provider

1. Generate template:
   ```
   Cmd+Shift+P → "Generate Provider Config Template"
   ```

2. Edit `.cursor/open-in-browser-providers.toml`:
   ```toml
   [provider.MY_GITHUB_ENTERPRISE]
   name = "Company GitHub Enterprise"
   remote_url_pattern = "^git@github\\.company\\.com:(.+)/(.+)\\.git$"
   file_url_template = "https://github.company.com/${owner}/${repo}/blob/${branch}/${relative_path}"
   directory_url_template = "https://github.company.com/${owner}/${repo}/tree/${branch}/${relative_path}"
   line_fragment_single = "#L${line_start}"
   line_fragment_range = "#L${line_start}-L${line_end}"
   pr_list_url_template = "https://github.company.com/${owner}/${repo}/pulls"
   compare_url_template = "https://github.company.com/${owner}/${repo}/compare/${base_branch}...${current_branch}"
   commit_url_template = "https://github.company.com/${owner}/${repo}/commit/${commit_sha}"
   commit_file_url_template = "https://github.company.com/${owner}/${repo}/commit/${commit_sha}#diff-${commit_file_hash}L${commit_line_number}"

   [provider.MY_GITHUB_ENTERPRISE.captures]
   owner = 1
   repo = 2
   ```

3. Save and use! Configuration is automatically reloaded.

#### Available Template Variables

- `${owner}`, `${repo}`, `${org}`, `${project}` - Repository identifiers (from regex captures)
- `${branch}` - Current branch name
- `${relative_path}` - Path relative to repository root
- `${line_start}`, `${line_end}` - Line numbers (for files)
- `${base_branch}`, `${current_branch}` - Branches (for comparisons)
- `${commit_sha}` - Commit SHA (for commit URLs)
- `${commit_file_hash}` - SHA256 hash of file path (for file-specific commit URLs)
- `${commit_file_path}` - File path for commit fragments
- `${commit_line_number}` - Line number in commit diff

#### Config File Locations (Priority Order)

1. Workspace setting: `open-in-browser.providerConfigPath` (highest priority)
2. Workspace file: `.cursor/open-in-browser-providers.toml`
3. User setting: `open-in-browser.providerConfigPath`
4. User file: `~/.config/vscode-open-in-browser/providers.toml`
5. Built-in defaults (fallback)

## Install

- Clone the repo
- CD into the repo folder and run `make`
- From Cursor/VScode run command "Install Extension from Location ..."

## Usage

### Opening Files

1. **From Editor:**
   - Open any file
   - Place cursor on a line or select lines
   - Press `Alt+B` (or right-click → "Open In Default Browser")
   - File opens in browser at that line

2. **From Terminal:**
   - Open integrated terminal (`Ctrl+` ` or `Cmd+` `)
   - Navigate to any directory with `cd`
   - Press `Alt+B` while terminal is focused
   - Directory opens in browser

3. **From Context Menu:**
   - Right-click on any file in Explorer
   - Select "Open In Default Browser"
   - File opens in browser

### Commands

| Command | Keyboard Shortcut | Description |
|---------|------------------|-------------|
| **Open In Default Browser** | `Alt+B` | Opens file/directory in your default browser |
| **Open In Other Browser** | (none) | Choose from multiple installed browsers |
| **Copy Remote URL** | `Shift+Alt+C` | Copies URL to clipboard instead of opening |
| **Open PR List** | `Shift+Alt+P` | Opens pull request/merge request list for repository |
| **Open Jira Ticket** | `Shift+Alt+J` | Opens Jira ticket from branch name |
| **Open Compare URL** | `Shift+Alt+M` | Opens branch comparison page on git provider |
| **Open Commit Under Cursor** | `Shift+Alt+G` | Opens the commit that last modified the current line (with file diff and line highlight) |
| **Generate Provider Config Template** | (none) | Creates `.cursor/open-in-browser-providers.toml` with defaults |
| **Reload Provider Config** | (none) | Reloads TOML configuration without restarting VS Code |
| **Show Detected Provider** | (none) | Shows which provider matched current repository (debug tool) |

### Context Menu

All commands are available via right-click:

- **In Editor**: Right-click inside any open file
- **In Explorer**: Right-click on files/folders in the sidebar
- **On Tab**: Right-click on the editor tab title
- **In Terminal**: Use keyboard shortcuts

## Configuration

Open VS Code settings (`Cmd+,` or `Ctrl+,`) and search for "open-in-browser":

### Available Settings

```json
{
  // Enable/disable git provider URLs (default: true)
  "open-in-browser.preferGitUrl": true,
  
  // Include line numbers when opening files (default: true)
  "open-in-browser.includeLineNumbers": true,
  
  // Enable terminal directory support (default: true)
  "open-in-browser.enableTerminalSupport": true,
  
  // Fallback to workspace root if terminal directory can't be detected (default: true)
  "open-in-browser.terminalFallbackToWorkspace": true,
  
  // Timeout for git commands in milliseconds (default: 5000)
  "open-in-browser.gitTimeout": 5000,
  
  // Base URL for Jira tickets
  "open-in-browser.jiraBaseUrl": "https://your-org.atlassian.net/browse",
  
  // Default base branch for compare URLs (default: "main")
  "open-in-browser.defaultBaseBranch": "main",
  
  // Path to custom provider config TOML file (optional)
  "open-in-browser.providerConfigPath": ".cursor/my-custom-providers.toml",
  
  // Use built-in providers as fallback when custom config fails (default: true)
  "open-in-browser.useBuiltinProviders": true,
  
  // Include file path and line number in commit URLs (default: true)
  "open-in-browser.commitUrlIncludeFile": true,
  
  // Set default browser (optional)
  "open-in-browser.default": "firefox"
}
```

### Browser Configuration

Set your preferred browser:

```json
{
  "open-in-browser.default": "firefox"
}
```

Available browsers:
- `firefox` - Mozilla Firefox
- `chrome` or `google chrome` - Google Chrome
- `safari` - Apple Safari (macOS)
- `edge` - Microsoft Edge
- `opera` - Opera

Leave empty to use system default browser.

## Supported Git Providers

### Built-in Providers

#### GitHub (SSH & HTTPS)

```
git@github.com:user/repo.git
https://github.com/user/repo.git
→ https://github.com/user/repo/tree/main/path/to/file.ts#L42
```

#### GitLab

```
git@gitlab.com:user/repo.git
→ https://gitlab.com/user/repo/blob/main/path/to/file.ts#L42
```

### Custom Providers

You can define your own git providers using TOML configuration! Perfect for:
- Private GitHub Enterprise instances
- Custom GitLab installations
- Bitbucket Server / Stash instances
- Any git web interface

See [Customizable Git Providers](#-customizable-git-providers) section above for details.

#### Example: Custom GitLab Instance

```toml
[provider.COMPANY_GITLAB]
name = "Company GitLab"
remote_url_pattern = "^git@gitlab\\.company\\.com:(.+)/(.+)\\.git$"
file_url_template = "https://gitlab.company.com/${group}/${repo}/-/blob/${branch}/${relative_path}"
directory_url_template = "https://gitlab.company.com/${group}/${repo}/-/tree/${branch}/${relative_path}"
line_fragment_single = "#L${line_start}"
line_fragment_range = "#L${line_start}-${line_end}"
pr_list_url_template = "https://gitlab.company.com/${group}/${repo}/-/merge_requests"
compare_url_template = "https://gitlab.company.com/${group}/${repo}/-/compare/${base_branch}...${current_branch}"
commit_url_template = "https://gitlab.company.com/${group}/${repo}/-/commit/${commit_sha}"
commit_file_url_template = "https://gitlab.company.com/${group}/${repo}/-/commit/${commit_sha}#diff-${commit_file_hash}_${commit_line_number}_${commit_line_number}"

[provider.COMPANY_GITLAB.captures]
group = 1
repo = 2
```

#### Example: Bitbucket Server

```toml
[provider.COMPANY_BITBUCKET]
name = "Company Bitbucket"
remote_url_pattern = "^ssh://git@bitbucket\\.company\\.com:(\\d+)/(.+)/(.+)\\.git$"
file_url_template = "https://bitbucket.company.com/projects/${project}/repos/${repo}/browse/${relative_path}?at=refs%2Fheads%2F${branch}"
directory_url_template = "https://bitbucket.company.com/projects/${project}/repos/${repo}/browse/${relative_path}?at=refs%2Fheads%2F${branch}"
line_fragment_single = "#${line_start}"
line_fragment_range = "#${line_start}-${line_end}"
pr_list_url_template = "https://bitbucket.company.com/projects/${project}/repos/${repo}/pull-requests"
compare_url_template = "https://bitbucket.company.com/projects/${project}/repos/${repo}/compare/commits?sourceBranch=refs/heads/${current_branch}&targetBranch=refs/heads/${base_branch}"
commit_url_template = "https://bitbucket.company.com/projects/${project}/repos/${repo}/commits/${commit_sha}"
commit_file_url_template = "https://bitbucket.company.com/projects/${project}/repos/${repo}/commits/${commit_sha}#${commit_file_path}"

[provider.COMPANY_BITBUCKET.captures]
port = 1
project = 2
repo = 3
```

## Platform Support

| Platform | Terminal Support | Process Detection |
|----------|------------------|-------------------|
| **macOS** | ✅ Yes | `lsof` command |
| **Linux** | ✅ Yes | `pwdx` or `/proc` |
| **Windows** | ✅ Yes | PowerShell |

All platforms also support VS Code Shell Integration (1.70+) for faster terminal directory detection.

## Requirements

- **VS Code**: 1.30.0 or higher
- **Git**: Required for git-aware features (optional for local file opening)
- **Terminal** (optional): For terminal directory support

## How It Works

### Smart Detection Flow

1. **Check for active editor**
   - If file is open → Use file path
   - If no file → Check terminal

2. **Check for active terminal**
   - If terminal focused → Detect current directory
   - Uses shell integration (VS Code 1.70+) or OS commands

3. **Detect git repository**
   - Check if path is in git repository
   - Get remote URL, branch, and relative path
   - Build appropriate web interface URL

4. **Add line information** (for files only)
   - Get cursor position or selection
   - Format for specific git provider

5. **Open or copy**
   - Open in browser or copy to clipboard
   - Show user feedback

## Troubleshooting

### Commands don't appear in context menu

**Solution**: Reload VS Code window
```
Cmd+Shift+P → "Developer: Reload Window"
```

### Terminal directory detection not working

**Possible causes:**
- Terminal not focused (click in terminal first)
- Shell integration disabled in VS Code
- Terminal just opened (wait a second for shell to initialize)

**Solution**: Try clicking in the terminal, then use the command.

### Git URL not opening correctly

**Check:**
1. Is the file committed and pushed to git?
2. Does the repository have a remote origin?
   ```bash
   git remote -v
   ```
3. Is the git provider supported?

**Fallback**: Extension will open local `file://` URL if git detection fails.

### Wrong line number or no line number

**Check:**
- `open-in-browser.includeLineNumbers` is enabled in settings
- Cursor is placed in the file (not in terminal)
- File is not a directory

### Custom git provider not working

**Check:**
1. Is the TOML file in the correct location?
   ```
   Cmd+Shift+P → "Show Detected Provider"
   ```
2. Is the TOML syntax valid?
   - Check Output panel: "Open in Browser - Providers"
3. Does the regex pattern match your remote URL?
   - Test pattern: `git remote -v`
   - Ensure special characters are escaped in TOML: `\\.` for `.`, `\\d` for `\d`

**Debug:**
```
Cmd+Shift+P → "Reload Provider Config"
Cmd+Shift+P → "Show Detected Provider"
```

## Known Limitations

- **Uncommitted files**: Opens local file:// URL (can't open in git provider until committed)
- **Detached HEAD**: May use commit SHA instead of branch name
- **No remote configured**: Opens local file:// URL
- **Unknown git providers**: Opens local file:// URL with warning

All limitations have graceful fallbacks!

## Contributing

Found a bug or have a feature request? Please open an issue on the [GitHub repository](https://github.com/f34nk/vscode-extensions-open-in-browser).

## License

MIT

## Credits

Original extension by [techer](https://github.com/SudoKillMe/vscode-extensions-open-in-browser)

Enhanced with git-aware features, line number support, terminal support, and copy to clipboard functionality.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

---

**Enjoy! 🚀**
