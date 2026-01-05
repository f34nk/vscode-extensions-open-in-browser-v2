# Open in Browser v2

[![vsmarketplacebadges](https://vsmarketplacebadges.dev/version/f34nk.open-in-browser-v2.svg)](https://vsmarketplacebadges.dev/version/f34nk.open-in-browser-v2.svg)

A VS Code extension that opens files and directories in your browser or git provider's web interface (GitHub, GitLab, Bitbucket).

Published as **v2** on [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=f34nk.open-in-browser-v2) and [Open VSX Registry](https://open-vsx.org/extension/f34nk/open-in-browser-v2).

## Quick Start

1. Open any file in VS Code
2. Press `Alt+B` to open in browser
3. For git-tracked files: opens in GitHub/GitLab/Bitbucket
4. For local files: opens as `file://` URL

## Commands

### Open In Default Browser

**Shortcut:** `Alt+B`

Opens the current file or directory in your default browser.

- **Files in git repos:** Opens in GitHub/GitLab/Bitbucket at the current line
- **Local files:** Opens as `file://` URL
- **Terminal:** Opens terminal's current directory (when terminal is focused)
- **Line numbers:** Automatically includes cursor position or selection

**Example:**
```
file.ts (cursor at line 42)
→ https://github.com/user/repo/blob/main/file.ts#L42

file.ts (lines 10-20 selected)
→ https://github.com/user/repo/blob/main/file.ts#L10-L20
```

### Open In Other Browser

Choose from a list of installed browsers (Chrome, Firefox, Safari, Edge, Brave, etc.).

### Copy Remote URL

**Shortcut:** `Shift+Alt+C`

Copies the URL to clipboard instead of opening it. Works with all features (git URLs, line numbers, directories).

### Open PR List

**Shortcut:** `Shift+Alt+P`

Opens the pull request (or merge request) list for the current git repository.

**Example:**
```
→ https://github.com/user/repo/pulls
→ https://gitlab.com/group/project/-/merge_requests
```

### Open Ticket In Browser

**Shortcut:** `Shift+Alt+J`

Extracts ticket number from the current branch name and opens it in your issue tracker (Jira, Linear, GitHub Issues, etc.).

**Example:**
```
Branch: feature/XY-1234-add-validation
→ https://your-company.atlassian.net/browse/XY-1234
```

**Setup:**

Create `.cursor/open-in-browser-tickets.toml`:

```toml
[ticket_provider.JIRA]
name = "Jira"
ticket_pattern = "([A-Z]{2,5}-[0-9]{1,6})"
ticket_url_template = "https://company.atlassian.net/browse/${ticket_id}"
priority = 1
```

Set config path in settings:

```json
{
  "open-in-browser.ticketProviderConfigPath": ".cursor/open-in-browser-tickets.toml"
}
```

Or run command: **"Generate Ticket Provider Config Template"**

### Open Compare URL

**Shortcut:** `Shift+Alt+M`

Opens the branch comparison page on your git provider (compares current branch with base branch).

**Example:**
```
Current branch: feature/new-feature
Base branch: main
→ https://github.com/user/repo/compare/main...feature/new-feature
```

**Configuration (optional):**

```json
{
  "open-in-browser.defaultBaseBranch": "main"
}
```

### Open Commit Under Cursor

**Shortcut:** `Shift+Alt+G`

Opens the git commit that last modified the line under the cursor. Links directly to the file diff with the line highlighted.

**Example:**
```
Cursor at line 22
→ https://github.com/user/repo/commit/abc123#diff-xyz...L22
```

### Generate Provider Config Template

Creates a `.cursor/open-in-browser-providers.toml` file with examples for customizing git providers.

### Reload Provider Config

Reloads git provider TOML configuration files without restarting VS Code.

### Show Detected Provider

Shows which git provider was detected for the current repository (useful for debugging).

### Generate Ticket Provider Config Template

Creates a `.cursor/open-in-browser-tickets.toml` file with examples for customizing ticket providers (Jira, Linear, GitHub Issues, etc.).

### Reload Ticket Provider Config

Reloads ticket provider TOML configuration files without restarting VS Code.

## Configuration

### Basic Settings

```json
{
  // Default browser (leave empty for system default)
  "open-in-browser.default": "firefox",
  
  // Enable git provider URLs
  "open-in-browser.preferGitUrl": true,
  
  // Include line numbers in URLs
  "open-in-browser.includeLineNumbers": true,
  
  // Path to ticket provider config TOML file
  "open-in-browser.ticketProviderConfigPath": ".cursor/open-in-browser-tickets.toml",
  
  // Default base branch for comparisons
  "open-in-browser.defaultBaseBranch": "main"
}
```

### Custom Git Providers

Add support for private GitHub Enterprise, GitLab, or Bitbucket instances.

**Step 1:** Create a TOML config file

Create `.cursor/open-in-browser-providers.toml` in your workspace, or run command **"Generate Provider Config Template"**.

**Step 2:** Configure the setting

```json
{
  "open-in-browser.providerConfigPaths": [
    ".cursor/open-in-browser-providers.toml"
  ]
}
```

**Step 3:** Define your provider

**Example: GitHub Enterprise**

```toml
[provider.GITHUB_ENTERPRISE]
name = "Company GitHub"
remote_url_pattern = "^git@github\\.your-company\\.com:(.+)/(.+)\\.git$"
file_url_template = "https://github.your-company.com/${owner}/${repo}/blob/${branch}/${relative_path}"
directory_url_template = "https://github.your-company.com/${owner}/${repo}/tree/${branch}/${relative_path}"
line_fragment_single = "#L${line_start}"
line_fragment_range = "#L${line_start}-L${line_end}"
pr_list_url_template = "https://github.your-company.com/${owner}/${repo}/pulls"
compare_url_template = "https://github.your-company.com/${owner}/${repo}/compare/${base_branch}...${current_branch}"
commit_url_template = "https://github.your-company.com/${owner}/${repo}/commit/${commit_sha}"
commit_file_url_template = "https://github.your-company.com/${owner}/${repo}/commit/${commit_sha}#diff-${commit_file_hash}L${commit_line_number}"

[provider.GITHUB_ENTERPRISE.captures]
owner = 1
repo = 2
```

### Template Variables

Available variables for URL templates:

| Variable | Description |
|----------|-------------|
| `${owner}`, `${repo}`, `${group}`, `${project}` | Repository identifiers from regex captures |
| `${branch}` | Current branch name |
| `${relative_path}` | File/directory path relative to repo root |
| `${line_start}`, `${line_end}` | Line numbers for selections |
| `${base_branch}`, `${current_branch}` | Branches for comparisons |
| `${commit_sha}` | Git commit SHA |
| `${commit_file_hash}` | File path hash for commit URLs |
| `${commit_line_number}` | Line number in commit diff |

### Config File Locations

Multiple config files are merged (later overrides earlier):

1. Built-in defaults (GitHub, GitLab, Bitbucket)
2. User home: `~/.config/vscode-open-in-browser/providers.toml`
3. Workspace: `.cursor/open-in-browser-providers.toml`
4. Custom paths (from `providerConfigPaths` setting)

**Example: Multiple config files**

```json
{
  "open-in-browser.providerConfigPaths": [
    "~/.config/company/git-providers.toml",
    ".cursor/project-specific.toml"
  ]
}
```

## Built-in Git Providers

- **GitHub** (github.com) - SSH and HTTPS
- **GitLab** (gitlab.com) - SSH and HTTPS
- **Bitbucket/Stash** (Atlassian) - SSH

All providers support: files, directories, line numbers, PR lists, branch comparisons, and commit links.

## Terminal Support

Works with integrated terminal! When terminal is focused:

- Press `Alt+B` to open terminal's current working directory
- Supports git repositories (opens in web interface)
- Supports local directories (opens as `file://` URL)
- Works on macOS, Linux, and Windows

## All Configuration Options

```json
{
  "open-in-browser.default": "",
  "open-in-browser.preferGitUrl": true,
  "open-in-browser.includeLineNumbers": true,
  "open-in-browser.enableTerminalSupport": true,
  "open-in-browser.terminalFallbackToWorkspace": true,
  "open-in-browser.gitTimeout": 5000,
  "open-in-browser.ticketProviderConfigPath": "",
  "open-in-browser.defaultBaseBranch": "main",
  "open-in-browser.providerConfigPaths": [],
  "open-in-browser.useBuiltinProviders": true,
  "open-in-browser.commitUrlIncludeFile": true
}
```

## Troubleshooting

### Custom provider not working

Run command: **"Show Detected Provider"** to see which provider matched.

Check:
1. TOML syntax is valid
2. Regex pattern matches your git remote URL (test with `git remote -v`)
3. Escape special characters: `\\.` for `.`, `\\d` for `\d`

### Terminal directory detection not working

- Click in the terminal first to focus it
- Wait a second after opening terminal for shell to initialize
- Check `open-in-browser.enableTerminalSupport` is enabled

### Ticket not found

- Check branch name contains ticket number matching configured pattern (e.g., `feature/XY-1234-description`)
- Verify ticket provider configuration is set up correctly in `.cursor/open-in-browser-tickets.toml`
- Run command: **"Generate Ticket Provider Config Template"** to create example config

## Requirements

- VS Code 1.30.0+
- Git (for git-aware features)

## License

LGPL-2.1-or-later

## Credits

Original by [techer](https://github.com/SudoKillMe/vscode-extensions-open-in-browser). Enhanced with git-aware features, line numbers, terminal support, and customizable providers.

---

**[Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=f34nk.open-in-browser-v2)** | [GitHub](https://github.com/f34nk/vscode-extensions-open-in-browser-v2) | [Changelog](CHANGELOG.md)
