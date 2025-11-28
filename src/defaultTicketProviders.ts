/**
 * Default ticket provider configuration
 * Provides built-in support for common issue tracking systems
 * 
 * NOTE: This is a template. Users should create a custom config file
 * with their actual Jira URL (e.g., company.atlassian.net)
 */
export const DEFAULT_TICKET_PROVIDERS_TOML = `# Ticket Provider Configuration
# Defines patterns and URLs for issue tracking systems
#
# IMPORTANT: This is a template with placeholder values.
# To use this extension:
# 1. Run command "Generate Ticket Provider Config Template"
# 2. Replace "EXAMPLE" with your company name
# 3. Update the ticket_url_template with your actual Jira URL

[ticket_provider.EXAMPLE_JIRA]
name = "Example Jira (Replace with your company)"
ticket_pattern = "([A-Z]{2,5}-[0-9]{1,6})"
ticket_url_template = "https://EXAMPLE.atlassian.net/browse/\${ticket_id}"
priority = 1

[ticket_provider.EXAMPLE_JIRA.captures]
ticket_id = 1

[settings]
default_provider = "EXAMPLE_JIRA"
check_order = ["EXAMPLE_JIRA"]
use_builtin_fallback = true
`;
