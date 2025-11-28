/**
 * Default built-in provider configurations
 * These are used when no custom config is found or as a fallback
 */

export const DEFAULT_GIT_PROVIDERS_TOML = `# Git Provider URL Builder Configuration
# This file defines how to build URLs for different git providers

[git_provider.GITHUB_SSH]
name = "GitHub SSH"
remote_url_pattern = "^git@github\\\\.com:(.+)/(.+)\\\\.git$"
file_url_template = "https://github.com/\${owner}/\${repo}/tree/\${branch}/\${relative_path}"
directory_url_template = "https://github.com/\${owner}/\${repo}/tree/\${branch}/\${relative_path}"
line_fragment_single = "#L\${line_start}"
line_fragment_range = "#L\${line_start}-L\${line_end}"
pr_list_url_template = "https://github.com/\${owner}/\${repo}/pulls"
compare_url_template = "https://github.com/\${owner}/\${repo}/compare/\${base_branch}...\${current_branch}"
commit_url_template = "https://github.com/\${owner}/\${repo}/commit/\${commit_sha}"
commit_file_url_template = "https://github.com/\${owner}/\${repo}/commit/\${commit_sha}#diff-\${commit_file_hash}L\${commit_line_number}"

[git_provider.GITHUB_SSH.captures]
owner = 1
repo = 2

[git_provider.GITHUB_HTTPS]
name = "GitHub HTTPS"
remote_url_pattern = "^https://github\\\\.com/(.+)/(.+)\\\\.git$"
file_url_template = "https://github.com/\${owner}/\${repo}/tree/\${branch}/\${relative_path}"
directory_url_template = "https://github.com/\${owner}/\${repo}/tree/\${branch}/\${relative_path}"
line_fragment_single = "#L\${line_start}"
line_fragment_range = "#L\${line_start}-L\${line_end}"
pr_list_url_template = "https://github.com/\${owner}/\${repo}/pulls"
compare_url_template = "https://github.com/\${owner}/\${repo}/compare/\${base_branch}...\${current_branch}"
commit_url_template = "https://github.com/\${owner}/\${repo}/commit/\${commit_sha}"
commit_file_url_template = "https://github.com/\${owner}/\${repo}/commit/\${commit_sha}#diff-\${commit_file_hash}L\${commit_line_number}"

[git_provider.GITHUB_HTTPS.captures]
owner = 1
repo = 2

[git_provider.GITLAB]
name = "GitLab"
remote_url_pattern = "^git@gitlab\\\\.com:(.+)/(.+)\\\\.git$"
file_url_template = "https://gitlab.com/\${owner}/\${repo}/-/blob/\${branch}/\${relative_path}"
directory_url_template = "https://gitlab.com/\${owner}/\${repo}/-/tree/\${branch}/\${relative_path}"
line_fragment_single = "#L\${line_start}"
line_fragment_range = "#L\${line_start}-\${line_end}"
pr_list_url_template = "https://gitlab.com/\${owner}/\${repo}/-/merge_requests"
compare_url_template = "https://gitlab.com/\${owner}/\${repo}/-/compare/\${base_branch}...\${current_branch}"
commit_url_template = "https://gitlab.com/\${owner}/\${repo}/-/commit/\${commit_sha}"
commit_file_url_template = "https://gitlab.com/\${owner}/\${repo}/-/commit/\${commit_sha}#diff-\${commit_file_hash}_\${commit_line_number}_\${commit_line_number}"

[git_provider.GITLAB.captures]
owner = 1
repo = 2

[git_provider.GITLAB_HTTPS]
name = "GitLab HTTPS"
remote_url_pattern = "^https://gitlab\\\\.com/(.+)/(.+)\\\\.git$"
file_url_template = "https://gitlab.com/\${owner}/\${repo}/-/blob/\${branch}/\${relative_path}"
directory_url_template = "https://gitlab.com/\${owner}/\${repo}/-/tree/\${branch}/\${relative_path}"
line_fragment_single = "#L\${line_start}"
line_fragment_range = "#L\${line_start}-\${line_end}"
pr_list_url_template = "https://gitlab.com/\${owner}/\${repo}/-/merge_requests"
compare_url_template = "https://gitlab.com/\${owner}/\${repo}/-/compare/\${base_branch}...\${current_branch}"
commit_url_template = "https://gitlab.com/\${owner}/\${repo}/-/commit/\${commit_sha}"
commit_file_url_template = "https://gitlab.com/\${owner}/\${repo}/-/commit/\${commit_sha}#diff-\${commit_file_hash}_\${commit_line_number}_\${commit_line_number}"

[git_provider.GITLAB_HTTPS.captures]
owner = 1
repo = 2

[git_provider.STASH]
name = "Atlassian Stash"
remote_url_pattern = "^ssh://git@(.+):(\\\\d+)/(.+)/(.+)\\\\.git$"
file_url_template = "https://\${host}/projects/\${project}/repos/\${repo}/browse/\${relative_path}?at=refs%2Fheads%2F\${branch}"
directory_url_template = "https://\${host}/projects/\${project}/repos/\${repo}/browse/\${relative_path}?at=refs%2Fheads%2F\${branch}"
line_fragment_single = "#\${line_start}"
line_fragment_range = "#\${line_start}-\${line_end}"
pr_list_url_template = "https://\${host}/projects/\${project}/repos/\${repo}/pull-requests"
compare_url_template = "https://\${host}/projects/\${project}/repos/\${repo}/compare/commits?sourceBranch=refs/heads/\${current_branch}&targetBranch=refs/heads/\${base_branch}"
commit_url_template = "https://\${host}/projects/\${project}/repos/\${repo}/commits/\${commit_sha}"
commit_file_url_template = "https://\${host}/projects/\${project}/repos/\${repo}/commits/\${commit_sha}#\${commit_file_path}"

[git_provider.STASH.captures]
host = 1
port = 2
project = 3
repo = 4

[settings]
provider_check_order = ["GITHUB_SSH", "GITHUB_HTTPS", "GITLAB", "GITLAB_HTTPS", "STASH"]
use_builtin_fallback = true
`;
