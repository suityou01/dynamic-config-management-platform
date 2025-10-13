// Configuration Item - represents a single config key-value pair
interface ConfigItem {
  key: string;
  value: any;
  deprecated?: boolean;
  deprecatedSince?: string;
}

// Schema definition for app versions
interface ConfigSchema {
  version: string;
  requiredKeys: string[];
  optionalKeys: string[];
  deprecatedKeys: string[];
}

// Rule condition types
type RuleConditionType =
  | "app_version"
  | "os"
  | "device"
  | "geo_country"
  | "geo_region"
  | "time_after"
  | "time_before"
  | "user_agent_match";

interface RuleCondition {
  type: RuleConditionType;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "regex";
  value: any;
}

// Rule resolution strategy
type RuleResolutionStrategy = "merge" | "override" | "inherit";

// Rule chaining types
type RuleChainOperator = "AND" | "OR" | "NOT" | "XOR";

interface RuleChain {
  operator: RuleChainOperator;
  rules: (string | RuleChain)[]; // Rule IDs or nested chains
}

// Rule composition types
type CompositionType = "extend" | "compose" | "mixin";

interface RuleComposition {
  type: CompositionType;
  baseRuleId?: string; // For extend
  sourceRuleIds?: string[]; // For compose/mixin
  overrides?: Partial<ConfigRule>; // Override specific properties
}

// Conditional loading
interface LoadCondition {
  type: "environment" | "feature_flag" | "percentage_rollout" | "custom";
  value: any;
}

interface ConditionalRule {
  ruleId: string;
  loadConditions: LoadCondition[];
  lazyLoad?: boolean; // Load only when conditions are met
}

interface ConfigRule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  conditions: RuleCondition[];
  config: Record<string, any>;
  resolutionStrategy: RuleResolutionStrategy;
  enabled: boolean;
  dependencies?: string[]; // Rule IDs that must match first
  exclusions?: string[]; // Rule IDs that prevent this rule from matching
  chain?: RuleChain; // Advanced chaining logic
  executeAfter?: string[]; // Execute after these rules
  executeBefore?: string[]; // Execute before these rules
  stopPropagation?: boolean; // Stop evaluating rules after this one
  composition?: RuleComposition; // Rule composition
  tags?: string[]; // For grouping and filtering
  metadata?: Record<string, any>; // Additional metadata
}

// Configuration Specification - versioned config for an app
interface ConfigSpecification {
  id: string;
  appId: string;
  version: string; // semantic version
  schema: ConfigSchema;
  defaultConfig: Record<string, any>;
  rules: ConfigRule[];
  conditionalRules?: ConditionalRule[]; // Rules with loading conditions
  ruleTemplates?: Record<string, Partial<ConfigRule>>; // Reusable rule templates
  environment?: "development" | "staging" | "production";
  featureFlags?: Record<string, boolean>; // Feature flags for conditional loading
  rolloutPercentages?: Record<string, number>; // Percentage rollouts per rule
  createdAt: string;
  updatedAt: string;
}

// Request context for rule evaluation
interface RequestContext {
  userAgent: string;
  parsedUA: UAParser.IResult;
  appVersion: string;
  os?: string;
  device?: string;
  geoCountry?: string;
  geoRegion?: string;
  clientProvidedGeo?: {
    country?: string;
    region?: string;
  };
  timestamp: Date;
  environment?: string;
  featureFlags?: Record<string, boolean>;
  userId?: string; // For percentage rollouts
  customContext?: Record<string, any>; // Custom context data
}

// Geo-location result
interface GeoLocation {
  country: string;
  region: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface RuleEvaluationResult {
  matched: boolean;
  rule: ConfigRule;
  reason?: string;
  chainEvaluation?: any;
}
