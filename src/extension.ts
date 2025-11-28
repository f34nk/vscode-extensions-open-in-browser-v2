'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as toml from '@iarna/toml';
import {
    openDefault,
    openBySpecify,
    copyRemoteUrl,
    openPrList,
    openTicketInBrowser,
    openCompareUrl,
    openCommitUnderCursor
} from './index';
import { GitProviderLoader } from './gitProviderLoader';
import { DynamicUrlBuilder, setDynamicUrlBuilder, getDynamicUrlBuilder } from './dynamicUrlBuilder';
import { DEFAULT_GIT_PROVIDERS_TOML } from './defaultGitProviders';
import { TicketProviderLoader } from './ticketProviderLoader';
import { TicketUrlBuilder, setTicketUrlBuilder } from './ticketUrlBuilder';
import { BrowserConfigLoader } from './browserConfigLoader';

// Global config loader instances
let gitProviderLoader: GitProviderLoader | null = null;
let ticketProviderLoader: TicketProviderLoader | null = null;
let browserConfigLoader: BrowserConfigLoader | null = null;

export async function activate(context: vscode.ExtensionContext) {
    // Initialize git provider config loader
    gitProviderLoader = new GitProviderLoader();
    
    // Load git provider configuration
    const config = await gitProviderLoader.loadConfig();
    if (config) {
        const dynamicBuilder = new DynamicUrlBuilder(config);
        setDynamicUrlBuilder(dynamicBuilder);
    }

    // Initialize ticket provider loader
    const outputChannel = vscode.window.createOutputChannel('Open in Browser - Tickets');
    ticketProviderLoader = new TicketProviderLoader(outputChannel);
    
    // Load ticket provider configuration
    const ticketConfig = await ticketProviderLoader.loadConfig();
    if (ticketConfig) {
        const ticketBuilder = new TicketUrlBuilder(ticketConfig);
        setTicketUrlBuilder(ticketBuilder);
    }

    // Initialize browser config loader
    browserConfigLoader = new BrowserConfigLoader();

    // Register existing commands
    let openDefaultCommand = vscode.commands.registerCommand('extension.openInDefaultBrowser', (path) => {
        openDefault(path);
    });
    let openBySpecifyCommand = vscode.commands.registerCommand('extension.openInOtherBrowser', (path) => {
        openBySpecify(path);
    });
    let copyRemoteUrlCommand = vscode.commands.registerCommand('extension.copyRemoteUrl', (path) => {
        copyRemoteUrl(path);
    });
    let openPrListCommand = vscode.commands.registerCommand('extension.openPrList', (path) => {
        openPrList(path);
    });
    let openTicketInBrowserCommand = vscode.commands.registerCommand('extension.openTicketInBrowser', (path) => {
        openTicketInBrowser(path);
    });
    let openCompareUrlCommand = vscode.commands.registerCommand('extension.openCompareUrl', (path) => {
        openCompareUrl(path);
    });
    let openCommitUnderCursorCommand = vscode.commands.registerCommand('extension.openCommitUnderCursor', () => {
        openCommitUnderCursor();
    });

    // Register git provider management commands
    let generateProviderConfigCommand = vscode.commands.registerCommand('extension.generateProviderConfig', async () => {
        await generateGitProviderConfigTemplate();
    });
    
    let reloadProviderConfigCommand = vscode.commands.registerCommand('extension.reloadProviderConfig', async () => {
        await reloadGitProviderConfig();
    });
    
    let showDetectedProviderCommand = vscode.commands.registerCommand('extension.showDetectedProvider', async () => {
        await showDetectedGitProvider();
    });

    // Register ticket provider management commands
    let generateTicketProviderConfigCommand = vscode.commands.registerCommand('extension.generateTicketProviderConfig', async () => {
        await generateTicketProviderConfigTemplate();
    });
    
    let reloadTicketProviderConfigCommand = vscode.commands.registerCommand('extension.reloadTicketProviderConfig', async () => {
        await reloadTicketProviderConfig();
    });

    context.subscriptions.push(openDefaultCommand);
    context.subscriptions.push(openBySpecifyCommand);
    context.subscriptions.push(copyRemoteUrlCommand);
    context.subscriptions.push(openPrListCommand);
    context.subscriptions.push(openTicketInBrowserCommand);
    context.subscriptions.push(openCompareUrlCommand);
    context.subscriptions.push(openCommitUnderCursorCommand);
    context.subscriptions.push(generateProviderConfigCommand);
    context.subscriptions.push(reloadProviderConfigCommand);
    context.subscriptions.push(showDetectedProviderCommand);
    context.subscriptions.push(generateTicketProviderConfigCommand);
    context.subscriptions.push(reloadTicketProviderConfigCommand);
    
    // Dispose config loaders on deactivation
    if (gitProviderLoader) {
        context.subscriptions.push(gitProviderLoader);
    }
    if (ticketProviderLoader) {
        context.subscriptions.push(ticketProviderLoader);
    }
}

/**
 * Generate provider config template in workspace
 */
async function generateGitProviderConfigTemplate(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const cursorDir = path.join(workspaceRoot, '.cursor');
    const configFile = path.join(cursorDir, 'open-in-browser-providers.toml');

    // Check if file already exists
    if (fs.existsSync(configFile)) {
        const overwrite = await vscode.window.showWarningMessage(
            'Provider config file already exists. Overwrite?',
            'Yes', 'No'
        );
        
        if (overwrite !== 'Yes') {
            return;
        }
    }

    // Create .cursor directory if it doesn't exist
    if (!fs.existsSync(cursorDir)) {
        try {
            fs.mkdirSync(cursorDir);
        } catch (error) {
            // Directory might already exist or permission issue
            if ((error as any).code !== 'EEXIST') {
                throw error;
            }
        }
    }

    // Get current loaded configuration
    let configContent: string;
    if (gitProviderLoader) {
        // Force reload to ensure we have the latest config
        const currentConfig = await gitProviderLoader.reloadConfig();
        const configPaths = gitProviderLoader.getConfigPaths();
        
        // Debug: Log what we got
        console.log('[generateProviderConfig] Config paths:', configPaths);
        console.log('[generateProviderConfig] Provider count:', currentConfig ? Object.keys(currentConfig.git_provider).length : 0);
        if (currentConfig) {
            console.log('[generateProviderConfig] Providers:', Object.keys(currentConfig.git_provider).join(', '));
        }
        
        if (currentConfig && Object.keys(currentConfig.git_provider).length > 0) {
            // Generate header comment with information about sources
            let header = '# Provider Configuration\n';
            header += '# Generated from currently loaded configuration\n';
            header += '#\n';
            
            if (configPaths.length > 0) {
                header += '# Source config files:\n';
                configPaths.forEach((configPath) => {
                    header += `#   - ${configPath}\n`;
                });
            } else {
                header += '# Source: Built-in default providers\n';
            }
            
            header += '#\n';
            header += `# Total providers: ${Object.keys(currentConfig.git_provider).length}\n`;
            header += `# Providers: ${Object.keys(currentConfig.git_provider).join(', ')}\n`;
            header += '#\n';
            header += '# This file includes all currently active providers.\n';
            header += '# You can modify, add, or remove providers as needed.\n';
            header += '#\n';
            header += '# After saving changes, run "Reload Provider Config" command\n';
            header += '# or restart VS Code to apply changes.\n\n';
            
            // Convert config to TOML
            try {
                const tomlString = toml.stringify(currentConfig as any);
                configContent = header + tomlString;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to serialize config: ${error}`);
                configContent = DEFAULT_GIT_PROVIDERS_TOML;
            }
        } else {
            // No config loaded, use defaults
            configContent = DEFAULT_GIT_PROVIDERS_TOML;
        }
    } else {
        // ConfigLoader not initialized, use defaults
        configContent = DEFAULT_GIT_PROVIDERS_TOML;
    }

    // Write config
    fs.writeFileSync(configFile, configContent, 'utf-8');

    // Open the file in editor
    const doc = await vscode.workspace.openTextDocument(configFile);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
        'Provider config template created! Edit the file and save to apply changes.'
    );
}

/**
 * Reload provider configuration
 */
async function reloadGitProviderConfig(): Promise<void> {
    if (!gitProviderLoader) {
        vscode.window.showErrorMessage('Config loader not initialized');
        return;
    }

    const config = await gitProviderLoader.reloadConfig();
    
    if (config) {
        const dynamicBuilder = new DynamicUrlBuilder(config);
        setDynamicUrlBuilder(dynamicBuilder);
        
        const configPaths = gitProviderLoader.getConfigPaths();
        let source: string;
        if (configPaths.length === 0) {
            source = 'built-in defaults';
        } else if (configPaths.length === 1) {
            source = path.basename(configPaths[0]);
        } else {
            source = `${configPaths.length} config files`;
        }
        
        vscode.window.showInformationMessage(
            `Provider configuration reloaded from ${source}`
        );
    } else {
        vscode.window.showErrorMessage('Failed to reload provider configuration');
    }
}

/**
 * Show detected provider for current file/repository
 */
async function showDetectedGitProvider(): Promise<void> {
    const dynamicBuilder = getDynamicUrlBuilder();
    
    if (!dynamicBuilder) {
        vscode.window.showWarningMessage(
            'No custom git provider configuration loaded. Using built-in git providers.'
        );
        return;
    }

    // Try to get remote URL from current workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Import git functions
    const { getRemoteUrl } = require('./git');
    
    try {
        const remoteUrl = await getRemoteUrl(workspaceFolders[0].uri.fsPath);
        
        if (!remoteUrl) {
            vscode.window.showInformationMessage('Not a git repository or no remote configured');
            return;
        }

        // Get debug info
        const debugInfo = dynamicBuilder.getDebugInfo(remoteUrl, {
            branch: 'main',
            relative_path: 'src/example.ts',
            line_start: 42,
            line_end: 50,
            base_branch: 'main',
            current_branch: 'feature/test'
        });

        if (!debugInfo.matched) {
            vscode.window.showWarningMessage(
                `No provider matched for remote URL: ${remoteUrl}`
            );
            return;
        }

        // Show results in output channel
        if (gitProviderLoader) {
            gitProviderLoader.showOutput();
            const outputChannel = (gitProviderLoader as any).outputChannel;
            outputChannel.appendLine('\n=== Detected Provider ===');
            outputChannel.appendLine(`Provider: ${debugInfo.providerName}`);
            outputChannel.appendLine(`Remote URL: ${remoteUrl}`);
            outputChannel.appendLine('\nCaptured Variables:');
            for (const [key, value] of Object.entries(debugInfo.captures || {})) {
                outputChannel.appendLine(`  ${key}: ${value}`);
            }
            if (debugInfo.sampleFileUrl) {
                outputChannel.appendLine(`\nSample File URL:\n  ${debugInfo.sampleFileUrl}`);
            }
            if (debugInfo.samplePrUrl) {
                outputChannel.appendLine(`\nSample PR URL:\n  ${debugInfo.samplePrUrl}`);
            }
            if (debugInfo.sampleCompareUrl) {
                outputChannel.appendLine(`\nSample Compare URL:\n  ${debugInfo.sampleCompareUrl}`);
            }
            outputChannel.appendLine('\n========================\n');
        }

        vscode.window.showInformationMessage(
            `Detected provider: ${debugInfo.providerName}. See output channel for details.`
        );
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error detecting provider: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Generate ticket provider config template in workspace
 */
async function generateTicketProviderConfigTemplate(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const cursorDir = path.join(workspaceRoot, '.cursor');
    const configFile = path.join(cursorDir, 'open-in-browser-tickets.toml');

    // Check if file already exists
    if (fs.existsSync(configFile)) {
        const overwrite = await vscode.window.showWarningMessage(
            'Ticket provider config file already exists. Overwrite?',
            'Yes', 'No'
        );
        
        if (overwrite !== 'Yes') {
            return;
        }
    }

    // Create .cursor directory if it doesn't exist
    if (!fs.existsSync(cursorDir)) {
        try {
            fs.mkdirSync(cursorDir);
        } catch (error) {
            // Directory might already exist or permission issue
            if ((error as any).code !== 'EEXIST') {
                throw error;
            }
        }
    }

    // Add helpful header
    const header = `# Ticket Provider Configuration
# Defines patterns and URLs for issue tracking systems (Jira, Linear, GitHub, etc.)
#
# This file is automatically watched for changes.
# After saving, configuration is reloaded automatically.
#
# IMPORTANT: Custom providers are automatically added to check_order
# You don't need to specify check_order - the extension will:
#   1. Check your custom providers FIRST (highest priority)
#   2. Then check built-in providers as fallback
#
# Example: Replace EXAMPLE with your company name
#
# [ticket_provider.MYCOMPANY_JIRA]
# name = "My Company Jira"
# ticket_pattern = "([A-Z]{2,5}-[0-9]{1,6})"
# ticket_url_template = "https://mycompany.atlassian.net/browse/\${ticket_id}"
# priority = 1
#
# Multiple providers example:
#
# [ticket_provider.MYCOMPANY_LINEAR]
# name = "Linear"
# ticket_pattern = "(LIN-[0-9]{1,5})"
# ticket_url_template = "https://linear.app/mycompany/issue/\${ticket_id}"
# priority = 2
#
# Available template variables:
# - \${ticket_id}: Full ticket ID (e.g., "OX-2615")
# - \${project_code}: Project code (e.g., "OX")
# - \${ticket_number}: Ticket number (e.g., "2615")
#
# NOTE: Do NOT include [settings] unless you want to override defaults
# Custom providers are automatically prioritized!

`;

    const configContent = header;

    // Write config
    fs.writeFileSync(configFile, configContent, 'utf-8');

    // Open the file in editor
    const doc = await vscode.workspace.openTextDocument(configFile);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
        'Ticket provider config template created! Edit and save to apply changes.'
    );
}

/**
 * Reload ticket provider configuration
 */
async function reloadTicketProviderConfig(): Promise<void> {
    if (!ticketProviderLoader) {
        vscode.window.showErrorMessage('Ticket provider loader not initialized');
        return;
    }

    const ticketConfig = await ticketProviderLoader.loadConfig();
    
    if (ticketConfig) {
        const ticketBuilder = new TicketUrlBuilder(ticketConfig);
        setTicketUrlBuilder(ticketBuilder);
        
        const configPaths = ticketProviderLoader.getConfigPaths();
        let source: string;
        if (configPaths.length === 0) {
            source = 'built-in defaults';
        } else if (configPaths.length === 1) {
            source = path.basename(configPaths[0]);
        } else {
            source = `${configPaths.length} config files`;
        }
        
        vscode.window.showInformationMessage(
            `Ticket provider configuration reloaded from ${source}`
        );
    } else {
        vscode.window.showErrorMessage('Failed to reload ticket provider configuration');
    }
}

/**
 * Get the browser config loader instance
 * @returns BrowserConfigLoader instance or null if not initialized
 */
export function getBrowserConfigLoader(): BrowserConfigLoader | null {
    return browserConfigLoader;
}

export function deactivate() {
    if (gitProviderLoader) {
        gitProviderLoader.dispose();
    }
    if (ticketProviderLoader) {
        ticketProviderLoader.dispose();
    }
}
