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
    openJiraTicket,
    openCompareUrl,
    openCommitUnderCursor
} from './index';
import { ConfigLoader } from './configLoader';
import { DynamicUrlBuilder, setDynamicUrlBuilder, getDynamicUrlBuilder } from './dynamicUrlBuilder';
import { DEFAULT_PROVIDERS_TOML } from './defaultProviders';

// Global config loader instance
let configLoader: ConfigLoader | null = null;

export async function activate(context: vscode.ExtensionContext) {
    // Initialize config loader
    configLoader = new ConfigLoader();
    
    // Load provider configuration
    const config = await configLoader.loadConfig();
    if (config) {
        const dynamicBuilder = new DynamicUrlBuilder(config);
        setDynamicUrlBuilder(dynamicBuilder);
    }

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
    let openJiraTicketCommand = vscode.commands.registerCommand('extension.openJiraTicket', (path) => {
        openJiraTicket(path);
    });
    let openCompareUrlCommand = vscode.commands.registerCommand('extension.openCompareUrl', (path) => {
        openCompareUrl(path);
    });
    let openCommitUnderCursorCommand = vscode.commands.registerCommand('extension.openCommitUnderCursor', () => {
        openCommitUnderCursor();
    });

    // Register new provider management commands
    let generateProviderConfigCommand = vscode.commands.registerCommand('extension.generateProviderConfig', async () => {
        await generateProviderConfigTemplate();
    });
    
    let reloadProviderConfigCommand = vscode.commands.registerCommand('extension.reloadProviderConfig', async () => {
        await reloadProviderConfig();
    });
    
    let showDetectedProviderCommand = vscode.commands.registerCommand('extension.showDetectedProvider', async () => {
        await showDetectedProvider();
    });

    context.subscriptions.push(openDefaultCommand);
    context.subscriptions.push(openBySpecifyCommand);
    context.subscriptions.push(copyRemoteUrlCommand);
    context.subscriptions.push(openPrListCommand);
    context.subscriptions.push(openJiraTicketCommand);
    context.subscriptions.push(openCompareUrlCommand);
    context.subscriptions.push(openCommitUnderCursorCommand);
    context.subscriptions.push(generateProviderConfigCommand);
    context.subscriptions.push(reloadProviderConfigCommand);
    context.subscriptions.push(showDetectedProviderCommand);
    
    // Dispose config loader on deactivation
    if (configLoader) {
        context.subscriptions.push(configLoader);
    }
}

/**
 * Generate provider config template in workspace
 */
async function generateProviderConfigTemplate(): Promise<void> {
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
    if (configLoader) {
        // Force reload to ensure we have the latest config
        const currentConfig = await configLoader.reloadConfig();
        const configPaths = configLoader.getConfigPaths();
        
        // Debug: Log what we got
        console.log('[generateProviderConfig] Config paths:', configPaths);
        console.log('[generateProviderConfig] Provider count:', currentConfig ? Object.keys(currentConfig.provider).length : 0);
        if (currentConfig) {
            console.log('[generateProviderConfig] Providers:', Object.keys(currentConfig.provider).join(', '));
        }
        
        if (currentConfig && Object.keys(currentConfig.provider).length > 0) {
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
            header += `# Total providers: ${Object.keys(currentConfig.provider).length}\n`;
            header += `# Providers: ${Object.keys(currentConfig.provider).join(', ')}\n`;
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
                configContent = DEFAULT_PROVIDERS_TOML;
            }
        } else {
            // No config loaded, use defaults
            configContent = DEFAULT_PROVIDERS_TOML;
        }
    } else {
        // ConfigLoader not initialized, use defaults
        configContent = DEFAULT_PROVIDERS_TOML;
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
async function reloadProviderConfig(): Promise<void> {
    if (!configLoader) {
        vscode.window.showErrorMessage('Config loader not initialized');
        return;
    }

    const config = await configLoader.reloadConfig();
    
    if (config) {
        const dynamicBuilder = new DynamicUrlBuilder(config);
        setDynamicUrlBuilder(dynamicBuilder);
        
        const configPaths = configLoader.getConfigPaths();
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
async function showDetectedProvider(): Promise<void> {
    const dynamicBuilder = getDynamicUrlBuilder();
    
    if (!dynamicBuilder) {
        vscode.window.showWarningMessage(
            'No custom provider configuration loaded. Using built-in providers.'
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
        if (configLoader) {
            configLoader.showOutput();
            const outputChannel = (configLoader as any).outputChannel;
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

export function deactivate() {
    if (configLoader) {
        configLoader.dispose();
    }
}
