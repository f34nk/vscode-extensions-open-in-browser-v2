/**
 * Configuration for a single ticket provider
 */
export interface TicketProviderConfig {
  /** Human-readable name */
  name: string;
  
  /** Regex pattern to extract ticket ID from branch name */
  ticket_pattern: string;
  
  /** URL template for ticket */
  ticket_url_template: string;
  
  /** Priority (lower = higher priority) */
  priority?: number;
  
  /** Mapping of capture group names to indices */
  captures?: {
    [key: string]: number;
  };
}

/**
 * Settings section
 */
export interface TicketSettings {
  /** Default provider ID */
  default_provider?: string;
  
  /** Order in which providers are checked */
  check_order?: string[];
  
  /** Whether to use built-in providers as fallback */
  use_builtin_fallback?: boolean;
}

/**
 * Complete ticket provider configuration
 */
export interface TicketProvidersConfig {
  /** Map of provider ID to provider configuration */
  ticket_provider: {
    [providerId: string]: TicketProviderConfig;
  };
  
  /** Optional settings */
  settings?: TicketSettings;
}

/**
 * Template context for URL building
 */
export interface TicketTemplateContext {
  /** Ticket ID extracted from branch */
  ticket_id?: string;
  
  /** Ticket number (numeric part only, if applicable) */
  ticket_number?: string;
  
  /** Project code (alphabetic part, if applicable) */
  project_code?: string;
  
  /** Additional variables from regex captures */
  [key: string]: string | number | undefined;
}

/**
 * Result of ticket extraction
 */
export interface TicketMatch {
  /** Provider that matched */
  provider: TicketProviderConfig;
  
  /** Provider ID */
  providerId: string;
  
  /** Extracted ticket ID */
  ticketId: string;
  
  /** Full URL to ticket */
  url: string;
}
