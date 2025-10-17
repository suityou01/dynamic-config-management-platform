# Configuration Management Platform - Type System Documentation

## Overview

This configuration management platform provides a sophisticated rule-based system for delivering context-aware configurations to mobile applications. The system evaluates rules based on various conditions and loads configurations conditionally based on user context, environment, feature flags, and percentage-based rollouts.

---

## Core Types

### ConfigItem

Represents a single configuration key-value pair.

```typescript
interface ConfigItem {
  key: string;           // Configuration key name
  value: any;            // Configuration value (any type)
  deprecated?: boolean;  // Whether this config item is deprecated
  deprecatedSince?: string; // Version since deprecation
}
```

**Usage**: Internal representation of individual config entries.

---

### ConfigSchema

Defines the schema and validation rules for a specific app version.

```typescript
interface ConfigSchema {
  version: string;           // Schema version (semantic versioning)
  requiredKeys: string[];    // Keys that MUST be present in config
  optionalKeys: string[];    // Keys that MAY be present in config
  deprecatedKeys: string[];  // Keys that are deprecated but still supported
}
```

**Example**:
```json
{
  "version": "0.0.2",
  "requiredKeys": ["apiEndpoint", "enableAnalytics", "theme"],
  "optionalKeys": ["maxRetries", "timeout", "featureToggles"],
  "deprecatedKeys": []
}
```

**Usage**: Validates that configurations contain all required keys and flags deprecated usage.

---

## Rule Condition Types

### RuleConditionType

Defines the types of conditions that can be evaluated for rule matching.

```typescript
type RuleConditionType =
  | "app_version"        // Match based on app version
  | "os"                 // Match based on operating system
  | "device"             // Match based on device type
  | "geo_country"        // Match based on country
  | "geo_region"         // Match based on region
  | "time_after"         // Match if current time is after value
  | "time_before"        // Match if current time is before value
  | "user_agent_match";  // Match using regex on user agent
```

### RuleCondition

A single condition that must be evaluated for a rule to match.

```typescript
interface RuleCondition {
  type: RuleConditionType;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "regex";
  value: any;
}
```

**Operators**:
- `eq`: Equal to
- `ne`: Not equal to
- `gt`: Greater than
- `lt`: Less than
- `gte`: Greater than or equal to
- `lte`: Less than or equal to
- `in`: Value is in array
- `regex`: Matches regular expression

**Examples**:

```json
// Match iOS devices
{
  "type": "os",
  "operator": "eq",
  "value": "iOS"
}

// Match UK or Ireland
{
  "type": "geo_country",
  "operator": "in",
  "value": ["GB", "IE"]
}

// Match government workers by user agent
{
  "type": "user_agent_match",
  "operator": "regex",
  "value": "GovWorker"
}

// Match app version 0.0.2 or higher
{
  "type": "app_version",
  "operator": "gte",
  "value": "0.0.2"
}
```

---

## Rule Resolution

### RuleResolutionStrategy

Determines how rule configurations are merged with existing configurations.

```typescript
type RuleResolutionStrategy = "merge" | "override" | "inherit";
```

**Strategies**:

1. **`merge`** (Most Common): Deep merge rule config with existing config
   ```javascript
   // Existing: { timeout: 5000, retry: 3 }
   // Rule:     { timeout: 8000, cache: 7200 }
   // Result:   { timeout: 8000, retry: 3, cache: 7200 }
   ```

2. **`override`**: Completely replace existing config with rule config
   ```javascript
   // Existing: { timeout: 5000, retry: 3 }
   // Rule:     { timeout: 8000 }
   // Result:   { timeout: 8000 }
   ```

3. **`inherit`**: Shallow merge, keeping existing values where they exist
   ```javascript
   // Existing: { timeout: 5000, retry: 3 }
   // Rule:     { timeout: 8000, cache: 7200 }
   // Result:   { timeout: 5000, retry: 3, cache: 7200 }
   ```

---

## Advanced Rule Features

### RuleChainOperator

Logical operators for combining multiple rules.

```typescript
type RuleChainOperator = "AND" | "OR" | "NOT" | "XOR";
```

**Usage**:
- `AND`: All rules in chain must match
- `OR`: At least one rule must match
- `NOT`: Negate the result of the first rule
- `XOR`: Exactly one rule must match

### RuleChain

Defines complex logical combinations of rules.

```typescript
interface RuleChain {
  operator: RuleChainOperator;
  rules: (string | RuleChain)[]; // Rule IDs or nested chains
}
```

**Example**:
```json
{
  "operator": "AND",
  "rules": [
    "ios-base",
    {
      "operator": "OR",
      "rules": ["uk-region", "eu-region"]
    }
  ]
}
```
This matches iOS devices in either UK or EU.

---

### CompositionType

Methods for composing rules from other rules.

```typescript
type CompositionType = "extend" | "compose" | "mixin";
```

**Types**:

1. **`extend`**: Inherit from a base rule and override specific properties
2. **`compose`**: Merge multiple rules into a single new rule
3. **`mixin`**: Apply one rule as modifications to another rule

### RuleComposition

Configuration for rule composition.

```typescript
interface RuleComposition {
  type: CompositionType;
  baseRuleId?: string;           // For extend - the rule to extend from
  sourceRuleIds?: string[];      // For compose/mixin - rules to combine
  overrides?: Partial<ConfigRule>; // Override specific properties
}
```

**Example - Extend**:
```json
{
  "id": "ios-premium",
  "composition": {
    "type": "extend",
    "baseRuleId": "ios-base",
    "overrides": {
      "config": {
        "timeout": 10000
      }
    }
  }
}
```

**Example - Compose**:
```json
{
  "id": "uk-ios-mobile",
  "composition": {
    "type": "compose",
    "sourceRuleIds": ["ios-base", "uk-region", "mobile-optimization"]
  }
}
```

---

## Conditional Loading

### LoadCondition

Conditions that determine whether a rule should be loaded.

```typescript
interface LoadCondition {
  type: "environment" | "feature_flag" | "percentage_rollout" | "custom";
  value: any;
}
```

**Types**:

1. **`environment`**: Load based on deployment environment
   ```json
   {
     "type": "environment",
     "value": "development"
   }
   ```

2. **`feature_flag`**: Load based on feature flag state
   ```json
   {
     "type": "feature_flag",
     "value": {
       "flagName": "experimentalUI",
       "expectedValue": true
     }
   }
   ```

3. **`percentage_rollout`**: Load for a percentage of users (deterministic based on userId)
   ```json
   {
     "type": "percentage_rollout",
     "value": {
       "percentage": 25,
       "ruleId": "early-adopter-rollout"
     }
   }
   ```

4. **`custom`**: Load based on custom context data
   ```json
   {
     "type": "custom",
     "value": {
       "key": "userType",
       "operator": "eq",
       "value": "mp"
     }
   }
   ```

### ConditionalRule

Links a rule to its loading conditions.

```typescript
interface ConditionalRule {
  ruleId: string;              // ID of the rule to conditionally load
  loadConditions: LoadCondition[]; // All conditions must be met (AND)
  lazyLoad?: boolean;          // Load only when conditions are met
}
```

**Example**:
```json
{
  "ruleId": "mp-preview-features",
  "loadConditions": [
    {
      "type": "custom",
      "value": {
        "key": "userType",
        "operator": "eq",
        "value": "mp"
      }
    }
  ],
  "lazyLoad": false
}
```

This rule only loads when `context.customContext.userType === "mp"`.

---

## ConfigRule

The main rule configuration object.

```typescript
interface ConfigRule {
  id: string;                          // Unique rule identifier
  name: string;                        // Human-readable name
  description?: string;                // Rule description
  priority: number;                    // Higher = evaluated first
  conditions: RuleCondition[];         // Conditions for matching
  config: Record<string, any>;         // Configuration to apply
  resolutionStrategy: RuleResolutionStrategy; // How to merge config
  enabled: boolean;                    // Whether rule is active
  dependencies?: string[];             // Rules that must match first
  exclusions?: string[];               // Rules that prevent this match
  chain?: RuleChain;                   // Advanced chaining logic
  executeAfter?: string[];             // Execute after these rules
  executeBefore?: string[];            // Execute before these rules
  stopPropagation?: boolean;           // Stop evaluating rules after this
  composition?: RuleComposition;       // Rule composition config
  tags?: string[];                     // Tags for organization
  metadata?: Record<string, any>;      // Additional metadata
}
```

**Key Properties**:

- **`priority`**: Controls evaluation order (higher values first)
- **`conditions`**: Empty array `[]` means always matches (if enabled)
- **`enabled`**: Set to `false` for conditionally-loaded rules
- **`dependencies`**: Rule won't match unless dependent rules matched first
- **`exclusions`**: Rule won't match if excluded rules already matched
- **`stopPropagation`**: Prevents evaluation of lower-priority rules

**Example - Basic Rule**:
```json
{
  "id": "ios-base",
  "name": "iOS Base Configuration",
  "priority": 100,
  "conditions": [
    {
      "type": "os",
      "operator": "eq",
      "value": "iOS"
    }
  ],
  "config": {
    "theme": "auto",
    "featureToggles": {
      "biometricAuth": true
    }
  },
  "resolutionStrategy": "merge",
  "enabled": true
}
```

**Example - Conditionally Loaded Rule**:
```json
{
  "id": "mp-preview-features",
  "name": "MP Preview Features",
  "priority": 200,
  "conditions": [],
  "config": {
    "featureToggles": {
      "mpOnlyFeatures": true,
      "constituencyInsights": true
    }
  },
  "resolutionStrategy": "merge",
  "enabled": false,
  "tags": ["mp", "vip"]
}
```

---

## ConfigSpecification

The complete configuration specification for an app version.

```typescript
interface ConfigSpecification {
  id: string;                              // Unique spec identifier
  appId: string;                           // Application identifier
  version: string;                         // Semantic version
  schema: ConfigSchema;                    // Schema validation rules
  defaultConfig: Record<string, any>;      // Base configuration
  rules: ConfigRule[];                     // All rules
  conditionalRules?: ConditionalRule[];    // Conditionally loaded rules
  ruleTemplates?: Record<string, Partial<ConfigRule>>; // Reusable templates
  environment?: "development" | "staging" | "production"; // Deployment env
  featureFlags?: Record<string, boolean>;  // Global feature flags
  rolloutPercentages?: Record<string, number>; // Rollout percentages
  createdAt: string;                       // ISO timestamp
  updatedAt: string;                       // ISO timestamp
}
```

**Example**:
```json
{
  "id": "govuk-app-v002",
  "appId": "GovUK.App",
  "version": "0.0.2",
  "environment": "production",
  "schema": {
    "version": "0.0.2",
    "requiredKeys": ["apiEndpoint", "enableAnalytics", "theme"],
    "optionalKeys": ["maxRetries", "timeout", "featureToggles"],
    "deprecatedKeys": []
  },
  "defaultConfig": {
    "apiEndpoint": "https://api.gov.uk/v2",
    "enableAnalytics": true,
    "theme": "auto",
    "timeout": 5000
  },
  "rules": [ /* ... */ ],
  "conditionalRules": [ /* ... */ ],
  "featureFlags": {
    "betaFeatures": true,
    "experimentalUI": false
  },
  "rolloutPercentages": {
    "beta-users": 25,
    "experimental-ui": 10
  }
}
```

---

## Request Context

### RequestContext

Contains all contextual information about the request used for rule evaluation.

```typescript
interface RequestContext {
  userAgent: string;                    // Raw user agent string
  parsedUA: UAParser.IResult;          // Parsed user agent details
  appVersion: string;                  // App version from UA or params
  os?: string;                         // Operating system
  device?: string;                     // Device type
  geoCountry?: string;                 // Country from IP lookup
  geoRegion?: string;                  // Region from IP lookup
  clientProvidedGeo?: {                // Client-provided geo (takes precedence)
    country?: string;
    region?: string;
  };
  timestamp: Date;                     // Request timestamp
  environment?: string;                // Environment (dev/staging/prod)
  featureFlags?: Record<string, boolean>; // Feature flags from request
  userId?: string;                     // User ID for percentage rollouts
  customContext?: Record<string, any>; // Custom context data
}
```

**How Context is Built**:

```javascript
const context: RequestContext = {
  userAgent: req.headers["user-agent"],
  parsedUA: UAParser(userAgent).getResult(),
  appVersion: extractAppVersion(userAgent) || version,
  os: parsedUA.os.name,
  device: parsedUA.device.type || "Desktop",
  geoCountry: (await geoService.lookupIP(clientIP))?.country,
  geoRegion: (await geoService.lookupIP(clientIP))?.region,
  clientProvidedGeo: {
    country: req.query.country,
    region: req.query.region
  },
  timestamp: new Date(),
  environment: req.query.env,
  featureFlags: req.query.flags ? JSON.parse(req.query.flags) : undefined,
  userId: req.query.userId,
  customContext: req.query.context ? JSON.parse(req.query.context) : undefined
};
```

**Example Request**:
```
GET /config/GovUK.App/0.0.2?userId=mp.example&context={"userType":"mp"}&flags={"betaFeatures":true}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)
```

**Resulting Context**:
```javascript
{
  userAgent: "GovUK.App/0.0.2 (iOS 17.0; iPhone)",
  parsedUA: { os: { name: "iOS" }, device: { type: "Mobile" } },
  appVersion: "0.0.2",
  os: "iOS",
  device: "Mobile",
  geoCountry: "GB",
  geoRegion: "England",
  timestamp: "2025-10-17T14:30:00Z",
  userId: "mp.example",
  featureFlags: { betaFeatures: true },
  customContext: { userType: "mp" }
}
```

---

## Rule Evaluation

### RuleEvaluationResult

Result of evaluating a single rule.

```typescript
interface RuleEvaluationResult {
  matched: boolean;        // Whether the rule matched
  rule: ConfigRule;        // The evaluated rule
  reason?: string;         // Why it matched or didn't match
  chainEvaluation?: any;   // Details of chain evaluation
}
```

**Example Results**:
```json
[
  {
    "matched": true,
    "rule": { "id": "ios-base-v2", "name": "iOS Base Configuration v2" },
    "reason": "All conditions met"
  },
  {
    "matched": false,
    "rule": { "id": "android-base-v2", "name": "Android Base Configuration v2" },
    "reason": "Conditions not met"
  },
  {
    "matched": false,
    "rule": { "id": "mp-preview-features", "name": "MP Preview Features" },
    "reason": "Missing dependencies"
  }
]
```

---

## Geolocation

### GeoLocation

Geographic location information derived from IP address.

```typescript
interface GeoLocation {
  country: string;      // ISO country code (e.g., "GB", "US")
  region: string;       // Region/state name
  city?: string;        // City name
  latitude?: number;    // Latitude coordinate
  longitude?: number;   // Longitude coordinate
}
```

**Example**:
```json
{
  "country": "GB",
  "region": "England",
  "city": "London",
  "latitude": 51.5074,
  "longitude": -0.1278
}
```

---

## Complete Example: MP Preview Access

Here's how all the types work together for an MP getting preview features:

**1. Configuration Specification** (`GovUK.App-0.0.2.json`):
```json
{
  "rules": [
    {
      "id": "mp-preview-features",
      "name": "MP Preview Features",
      "priority": 200,
      "conditions": [],
      "config": {
        "featureToggles": {
          "mpOnlyFeatures": true,
          "constituencyInsights": true,
          "votingAlerts": true
        }
      },
      "resolutionStrategy": "merge",
      "enabled": false
    }
  ],
  "conditionalRules": [
    {
      "ruleId": "mp-preview-features",
      "loadConditions": [
        {
          "type": "custom",
          "value": {
            "key": "userType",
            "operator": "eq",
            "value": "mp"
          }
        }
      ]
    }
  ]
}
```

**2. API Request**:
```
GET /config/GovUK.App/0.0.2?userId=mp.boris&context={"userType":"mp"}
User-Agent: GovUK.App/0.0.2 (iOS 17.0; iPhone)
```

**3. Request Context Built**:
```javascript
{
  userId: "mp.boris",
  customContext: { userType: "mp" },
  os: "iOS",
  device: "Mobile"
}
```

**4. Conditional Loading**:
- Checks: `context.customContext.userType === "mp"` ✓
- Loads: `mp-preview-features` rule
- Enables: Sets `enabled: true` on the rule

**5. Rule Evaluation**:
- `ios-base-v2` matches (iOS device)
- `mp-preview-features` matches (loaded conditionally, has no conditions)
- Other rules evaluated...

**6. Configuration Resolution**:
- Start with `defaultConfig`
- Merge `ios-base-v2` config
- Merge `mp-preview-features` config
- Return final merged configuration

**7. API Response**:
```json
{
  "config": {
    "featureToggles": {
      "biometricAuth": true,
      "mpOnlyFeatures": true,
      "constituencyInsights": true,
      "votingAlerts": true
    }
  },
  "matchedRules": [
    { "id": "mp-preview-features", "priority": 200 },
    { "id": "ios-base-v2", "priority": 100 }
  ]
}
```

---

## Best Practices

### 1. Rule Priority Ranges

Organize rules by priority ranges:
- **300-399**: Environment overrides (development, staging)
- **200-299**: VIP user segments (MPs, ministers, officials)
- **100-199**: Base platform rules (iOS, Android)
- **50-99**: Regional optimizations (geo-targeting)
- **1-49**: Feature-specific rules

### 2. Conditionally Loaded Rules

For rules that should only apply to specific contexts:
- Set `conditions: []` (empty array)
- Set `enabled: false`
- Add to `conditionalRules` with appropriate `loadConditions`

### 3. Resolution Strategies

- Use `"merge"` for most cases (accumulates features)
- Use `"override"` for environment switches (complete replacement)
- Use `"inherit"` when you want to preserve existing values

### 4. Rule Dependencies

Use dependencies to enforce ordering:
```json
{
  "id": "government-workers",
  "dependencies": ["ios-base-v2", "android-base-v2"],
  "executeAfter": ["ios-base-v2", "android-base-v2"]
}
```

### 5. Percentage Rollouts

- Use deterministic hashing (based on userId + ruleId)
- Start small (5-10%) and gradually increase
- Combine with feature flags for controlled rollouts

---

## API Query Parameters

### Standard Parameters

- `env`: Environment name (`development`, `staging`, `production`)
- `userId`: User identifier (required for percentage rollouts)
- `country`: ISO country code override
- `region`: Region/state name override
- `flags`: JSON object of feature flags
  ```
  ?flags={"betaFeatures":true,"experimentalUI":false}
  ```
- `context`: JSON object of custom context data
  ```
  ?context={"userType":"mp","clearanceLevel":"high"}
  ```

### Example Requests

**Regular User**:
```
GET /config/GovUK.App/0.0.2?userId=user123
```

**MP User**:
```
GET /config/GovUK.App/0.0.2?userId=mp.example&context={"userType":"mp"}
```

**Beta Tester**:
```
GET /config/GovUK.App/0.0.2?userId=beta001&flags={"betaFeatures":true}
```

**Development Environment**:
```
GET /config/GovUK.App/0.0.2?env=development&userId=dev.tester
```

---

## Summary

The type system provides:

1. **Flexible Rule Matching**: Multiple condition types with various operators
2. **Conditional Loading**: Load rules based on context, not just matching
3. **Advanced Composition**: Extend, compose, and mix rules
4. **Percentage Rollouts**: Gradual feature deployment
5. **Priority-Based Execution**: Control evaluation order
6. **Multiple Resolution Strategies**: Merge, override, or inherit configs
7. **Rich Context**: User agent, geo, environment, custom data
8. **Validation**: Schema-based configuration validation

This enables sophisticated configuration management for mobile apps with support for A/B testing, gradual rollouts, VIP user segments, environment-specific configs, and more.
