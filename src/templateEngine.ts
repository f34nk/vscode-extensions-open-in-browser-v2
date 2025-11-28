/**
 * Template engine for processing URL templates with variable substitution
 */

import { GitTemplateContext } from './gitProviderConfig';

/**
 * Process a template string by replacing ${variable} placeholders with values from context
 * @param template Template string with ${variable} placeholders
 * @param context Object containing variable values
 * @returns Processed string with variables replaced
 */
export function processTemplate(template: string, context: GitTemplateContext): string {
  return template.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
    const value = context[variableName];
    
    if (value === undefined || value === null) {
      // Variable not found in context - leave placeholder or use empty string
      return '';
    }
    
    return String(value);
  });
}

/**
 * URL-encode a path segment while preserving forward slashes
 * @param segment Path segment to encode
 * @returns URL-encoded segment
 */
export function encodePathSegment(segment: string): string {
  // Split by / to preserve directory separators
  return segment
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

/**
 * URL-encode a query parameter value
 * @param value Parameter value to encode
 * @returns URL-encoded value
 */
export function encodeQueryParam(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Build context object from captured groups and standard variables
 * @param captures Captured groups from regex match
 * @param captureMapping Mapping of capture group names to indices
 * @param standardVars Standard template variables (branch, relative_path, etc.)
 * @returns Complete template context
 */
export function buildGitTemplateContext(
  captures: RegExpMatchArray,
  captureMapping: { [key: string]: number },
  standardVars: Partial<GitTemplateContext> = {}
): GitTemplateContext {
  const context: GitTemplateContext = { ...standardVars };
  
  // Extract captured variables based on mapping
  for (const [name, index] of Object.entries(captureMapping)) {
    if (captures[index] !== undefined) {
      context[name] = captures[index];
    }
  }
  
  return context;
}

/**
 * Validate that a template string has valid variable syntax
 * @param template Template string to validate
 * @returns true if valid, false otherwise
 */
export function validateTemplate(template: string): boolean {
  // Check for unmatched ${ or }
  const openBraces = (template.match(/\$\{/g) || []).length;
  const closeBraces = (template.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    return false;
  }
  
  // Check for empty variable names ${} 
  if (/\$\{\s*\}/.test(template)) {
    return false;
  }
  
  return true;
}

/**
 * Extract all variable names used in a template
 * @param template Template string
 * @returns Array of variable names
 */
export function extractVariables(template: string): string[] {
  const variables: string[] = [];
  const regex = /\$\{([^}]+)\}/g;
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }
  
  return variables;
}
