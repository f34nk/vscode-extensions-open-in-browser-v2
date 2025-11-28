import { TicketProvidersConfig, TicketProviderConfig, TicketMatch, TicketTemplateContext } from './ticketProviderConfig';

export class TicketUrlBuilder {
  private config: TicketProvidersConfig;

  constructor(config: TicketProvidersConfig) {
    this.config = config;
  }

  /**
   * Extract ticket from branch name using all providers
   */
  extractTicket(branchName: string): TicketMatch | null {
    const providers = this.getProvidersInOrder();
    
    for (const [providerId, provider] of providers) {
      try {
        const regex = new RegExp(provider.ticket_pattern);
        const match = branchName.match(regex);
        
        if (match) {
          const ticketId = match[1]; // First capture group
          const url = this.buildTicketUrl(provider, ticketId, match);
          
          return {
            provider,
            providerId,
            ticketId,
            url
          };
        }
      } catch (error) {
        console.error(`Invalid regex for ticket provider ${providerId}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Build ticket URL from template
   */
  private buildTicketUrl(provider: TicketProviderConfig, ticketId: string, match: RegExpMatchArray): string {
    const context: TicketTemplateContext = {
      ticket_id: ticketId
    };
    
    // Parse ticket ID for additional context
    // Example: "XY-1234" → project_code: "XY", ticket_number: "1234"
    const parts = ticketId.match(/^([A-Z]+)-(\d+)$/);
    if (parts) {
      context.project_code = parts[1];
      context.ticket_number = parts[2];
    } else {
      // For patterns like #123, extract just the number
      const numMatch = ticketId.match(/\d+/);
      if (numMatch) {
        context.ticket_number = numMatch[0];
      }
    }
    
    // Add named captures if defined
    if (provider.captures) {
      for (const [name, index] of Object.entries(provider.captures)) {
        if (match[index]) {
          context[name] = match[index];
        }
      }
    }
    
    // Simple template substitution
    let url = provider.ticket_url_template;
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) {
        url = url.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
      }
    }
    
    return url;
  }

  /**
   * Get providers in priority order
   */
  private getProvidersInOrder(): [string, TicketProviderConfig][] {
    const providers = Object.entries(this.config.ticket_provider);
    
    // Check if there's a custom order
    const customOrder = this.config.settings?.check_order;
    
    if (customOrder && customOrder.length > 0) {
      return providers.sort(([aId], [bId]) => {
        const aIndex = customOrder.indexOf(aId);
        const bIndex = customOrder.indexOf(bId);
        
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }
    
    // Sort by priority
    return providers.sort((a, b) => {
      const aPriority = a[1].priority ?? 999;
      const bPriority = b[1].priority ?? 999;
      return aPriority - bPriority;
    });
  }

  /**
   * Get all configured providers
   */
  getProviders(): [string, TicketProviderConfig][] {
    return Object.entries(this.config.ticket_provider);
  }
}

// Global instance
let ticketUrlBuilderInstance: TicketUrlBuilder | null = null;

export function setTicketUrlBuilder(builder: TicketUrlBuilder | null): void {
  ticketUrlBuilderInstance = builder;
}

export function getTicketUrlBuilder(): TicketUrlBuilder | null {
  return ticketUrlBuilderInstance;
}

/**
 * Extract ticket from branch name (convenience function)
 */
export function extractTicketFromBranch(branchName: string): TicketMatch | null {
  if (!ticketUrlBuilderInstance) {
    return null;
  }
  
  return ticketUrlBuilderInstance.extractTicket(branchName);
}
