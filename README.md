# Configuration Platform - Usage Examples

## Table of Contents
1. [Basic Configuration Setup](#basic-configuration-setup)
2. [Rule Composition Patterns](#rule-composition-patterns)
3. [Conditional Rule Loading](#conditional-rule-loading)
4. [Advanced Rule Chaining](#advanced-rule-chaining)
5. [Real-World Scenarios](#real-world-scenarios)

---

## Basic Configuration Setup

### Creating a Configuration Specification

```json
POST /config

{
  "id": "spec-001",
  "appId": "mobile-app",
  "version": "1.0.0",
  "environment": "production",
  "schema": {
    "version": "1.0.0",
    "requiredKeys": ["apiUrl", "timeout"],
    "optionalKeys": ["debugMode", "analyticsEnabled"],
    "deprecatedKeys": []
  },
  "defaultConfig": {
    "apiUrl": "https://api.example.com",
    "timeout": 30000,
    "debugMode": false,
    "analyticsEnabled": true
  },
  "rules": [],
  "featureFlags": {
    "new_checkout": false,
    "dark_mode": true
  }
}
```

### Fetching Configuration

```bash
GET /config/mobile-app/1.0.0?userId=user123&country=US

# Response includes:
# - Resolved config
# - Matched rules
# - Validation results
# - Evaluation details
```

---

## Rule Composition Patterns

### 1. Extend Pattern - Inheritance

Create a base rule and extend it for specific platforms:

```json
{
  "rules": [
    {
      "id": "base-premium",
      "name": "Premium Base Config",
      "priority": 10,
      "conditions": [
        {
          "type": "app_version",
          "operator": "gte",
          "value": "1.0.0"
        }
      ],
      "config": {
        "maxUploadSize": 100,
        "premiumFeatures": true
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "premium-ios",
      "name": "Premium iOS Config",
      "priority": 15,
      "conditions": [],
      "config": {},
      "composition": {
        "type": "extend",
        "baseRuleId": "base-premium",
        "overrides": {
          "conditions": [
            {
              "type": "os",
              "operator": "eq",
              "value": "iOS"
            }
          ],
          "config": {
            "maxUploadSize": 150,
            "iosSpecificFeature": true
          }
        }
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ]
}
```

### 2. Compose Pattern - Merging Rules

Combine multiple feature rules into one:

```json
POST /rules/compose

{
  "appId": "mobile-app",
  "version": "1.0.0",
  "sourceRuleIds": ["analytics-rule", "payment-rule", "social-rule"],
  "newRuleId": "full-feature-set",
  "strategy": "merge"
}

// Creates a new rule that merges all three source rules:
// - Combines all conditions (AND logic)
// - Merges all configs
// - Combines dependencies and exclusions
// - Uses highest priority
```

### 3. Mixin Pattern - Reusable Behaviors

Apply common behaviors across rules:

```json
{
  "rules": [
    {
      "id": "logging-mixin",
      "name": "Logging Mixin",
      "priority": 1,
      "conditions": [],
      "config": {
        "logging": {
          "level": "info",
          "enabled": true
        }
      },
      "resolutionStrategy": "merge",
      "enabled": true,
      "tags": ["mixin"]
    },
    {
      "id": "production-rule",
      "name": "Production Config",
      "priority": 20,
      "conditions": [
        {
          "type": "user_agent_match",
          "operator": "regex",
          "value": ".*Production.*"
        }
      ],
      "config": {
        "apiUrl": "https://prod.example.com"
      },
      "composition": {
        "type": "mixin",
        "sourceRuleIds": ["logging-mixin"]
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ]
}
```

### 4. Rule Templates - Reusable Definitions

Define templates and create instances:

```json
{
  "ruleTemplates": {
    "geo-rule-template": {
      "priority": 10,
      "resolutionStrategy": "merge",
      "enabled": true,
      "conditions": [
        {
          "type": "geo_country",
          "operator": "eq",
          "value": "PLACEHOLDER"
        }
      ],
      "config": {
        "currency": "USD",
        "language": "en"
      }
    }
  }
}

// Create rule from template:
POST /rules/from-template

{
  "appId": "mobile-app",
  "version": "1.0.0",
  "templateId": "geo-rule-template",
  "overrides": {
    "id": "uk-rule",
    "name": "UK Configuration",
    "conditions": [
      {
        "type": "geo_country",
        "operator": "eq",
        "value": "GB"
      }
    ],
    "config": {
      "currency": "GBP",
      "language": "en-GB"
    }
  }
}
```

---

## Conditional Rule Loading

### 1. Environment-Based Loading

Load rules only in specific environments:

```json
{
  "environment": "production",
  "rules": [
    {
      "id": "prod-config",
      "name": "Production Config",
      "priority": 100,
      "conditions": [],
      "config": {
        "apiUrl": "https://prod.api.example.com"
      },
      "resolutionStrategy": "override",
      "enabled": true
    }
  ],
  "conditionalRules": [
    {
      "ruleId": "debug-config",
      "loadConditions": [
        {
          "type": "environment",
          "value": "development"
        }
      ]
    }
  ]
}
```

### 2. Feature Flag Based Loading

Control rule activation via feature flags:

```json
{
  "featureFlags": {
    "new_checkout": true,
    "experimental_ui": false
  },
  "conditionalRules": [
    {
      "ruleId": "new-checkout-rule",
      "loadConditions": [
        {
          "type": "feature_flag",
          "value": {
            "flagName": "new_checkout",
            "expectedValue": true
          }
        }
      ],
      "lazyLoad": true
    }
  ]
}

// Client request with feature flags:
GET /config/mobile-app/1.0.0?flags={"new_checkout":true}
```

### 3. Percentage Rollouts

Gradually roll out features to a percentage of users:

```json
{
  "conditionalRules": [
    {
      "ruleId": "beta-feature",
      "loadConditions": [
        {
          "type": "percentage_rollout",
          "value": {
            "percentage": 25,
            "ruleId": "beta-feature"
          }
        }
      ]
    }
  ]
}

// Request must include userId for deterministic rollout:
GET /config/mobile-app/1.0.0?userId=user123
```

### 4. Custom Conditions

Use custom context for conditional loading:

```json
{
  "conditionalRules": [
    {
      "ruleId": "vip-config",
      "loadConditions": [
        {
          "type": "custom",
          "value": {
            "key": "userTier",
            "operator": "eq",
            "value": "premium"
          }
        }
      ]
    }
  ]
}

// Pass custom context:
GET /config/mobile-app/1.0.0?context={"userTier":"premium"}
```

### 5. Combined Conditions

Multiple conditions (all must be true):

```json
{
  "conditionalRules": [
    {
      "ruleId": "special-config",
      "loadConditions": [
        {
          "type": "environment",
          "value": "production"
        },
        {
          "type": "feature_flag",
          "value": {
            "flagName": "special_feature",
            "expectedValue": true
          }
        },
        {
          "type": "percentage_rollout",
          "value": {
            "percentage": 50,
            "ruleId": "special-config"
          }
        }
      ]
    }
  ]
}
```

---

## Advanced Rule Chaining

### 1. AND/OR/NOT Logic

```json
{
  "id": "complex-rule",
  "name": "Complex Condition Rule",
  "priority": 50,
  "conditions": [],
  "chain": {
    "operator": "OR",
    "rules": [
      "ios-rule",
      {
        "operator": "AND",
        "rules": ["android-rule", "premium-rule"]
      }
    ]
  },
  "config": {
    "specialFeature": true
  },
  "resolutionStrategy": "merge",
  "enabled": true
}
```

### 2. XOR (Exclusive OR)

Only one condition must be true:

```json
{
  "chain": {
    "operator": "XOR",
    "rules": ["free-tier-rule", "premium-tier-rule"]
  }
}
```

### 3. Dependencies and Exclusions

```json
{
  "rules": [
    {
      "id": "base-rule",
      "name": "Base Configuration",
      "priority": 10,
      "conditions": [
        {
          "type": "app_version",
          "operator": "gte",
          "value": "1.0.0"
        }
      ],
      "config": {
        "baseFeature": true
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "addon-rule",
      "name": "Addon Configuration",
      "priority": 20,
      "dependencies": ["base-rule"],
      "conditions": [
        {
          "type": "geo_country",
          "operator": "eq",
          "value": "US"
        }
      ],
      "config": {
        "addonFeature": true
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "free-tier-rule",
      "name": "Free Tier Config",
      "priority": 15,
      "exclusions": ["addon-rule"],
      "conditions": [],
      "config": {
        "limitedFeatures": true
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ]
}
```

### 4. Execution Order Control

```json
{
  "rules": [
    {
      "id": "setup-rule",
      "name": "Setup Configuration",
      "priority": 5,
      "conditions": [],
      "config": {
        "initialized": true
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "main-rule",
      "name": "Main Configuration",
      "priority": 10,
      "executeAfter": ["setup-rule"],
      "executeBefore": ["cleanup-rule"],
      "conditions": [],
      "config": {
        "mainFeature": true
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "cleanup-rule",
      "name": "Cleanup Configuration",
      "priority": 15,
      "conditions": [],
      "config": {
        "cleanupEnabled": true
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ]
}
```

### 5. Stop Propagation

Prevent evaluation of lower-priority rules:

```json
{
  "id": "emergency-override",
  "name": "Emergency Override",
  "priority": 1000,
  "stopPropagation": true,
  "conditions": [
    {
      "type": "feature_flag",
      "operator": "eq",
      "value": true
    }
  ],
  "config": {
    "emergencyMode": true,
    "apiUrl": "https://emergency.example.com"
  },
  "resolutionStrategy": "override",
  "enabled": true
}
```

---

## Real-World Scenarios

### Scenario 1: Multi-Region Mobile App

```json
{
  "appId": "ecommerce-app",
  "version": "2.0.0",
  "defaultConfig": {
    "apiUrl": "https://api.example.com",
    "currency": "USD",
    "language": "en",
    "paymentMethods": ["credit_card"]
  },
  "ruleTemplates": {
    "region-template": {
      "priority": 10,
      "resolutionStrategy": "merge",
      "conditions": []
    }
  },
  "rules": [
    {
      "id": "europe-rule",
      "name": "European Configuration",
      "priority": 20,
      "conditions": [
        {
          "type": "geo_country",
          "operator": "in",
          "value": ["GB", "FR", "DE", "IT", "ES"]
        }
      ],
      "config": {
        "currency": "EUR",
        "paymentMethods": ["credit_card", "sepa", "ideal"]
      },
      "composition": {
        "type": "extend",
        "baseRuleId": "region-template"
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "uk-specific",
      "name": "UK Specific Config",
      "priority": 25,
      "dependencies": ["europe-rule"],
      "conditions": [
        {
          "type": "geo_country",
          "operator": "eq",
          "value": "GB"
        }
      ],
      "config": {
        "currency": "GBP",
        "language": "en-GB"
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ]
}
```

### Scenario 2: A/B Testing with Gradual Rollout

```json
{
  "appId": "social-app",
  "version": "3.0.0",
  "featureFlags": {
    "new_feed_algorithm": true
  },
  "rules": [
    {
      "id": "control-group",
      "name": "Control Group - Old Algorithm",
      "priority": 10,
      "conditions": [
        {
          "type": "app_version",
          "operator": "gte",
          "value": "3.0.0"
        }
      ],
      "config": {
        "feedAlgorithm": "v1",
        "feedRefreshRate": 60000
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ],
  "conditionalRules": [
    {
      "ruleId": "test-group-25",
      "loadConditions": [
        {
          "type": "feature_flag",
          "value": {
            "flagName": "new_feed_algorithm",
            "expectedValue": true
          }
        },
        {
          "type": "percentage_rollout",
          "value": {
            "percentage": 25,
            "ruleId": "test-group-25"
          }
        }
      ]
    }
  ]
}
```

### Scenario 3: Platform-Specific Features with Mixins

```json
{
  "appId": "productivity-app",
  "version": "1.5.0",
  "ruleTemplates": {
    "analytics-mixin": {
      "config": {
        "analytics": {
          "enabled": true,
          "trackingLevel": "standard"
        }
      }
    },
    "premium-mixin": {
      "config": {
        "premiumFeatures": {
          "cloudSync": true,
          "advancedExport": true
        }
      }
    }
  },
  "rules": [
    {
      "id": "ios-base",
      "name": "iOS Base Config",
      "priority": 10,
      "conditions": [
        {
          "type": "os",
          "operator": "eq",
          "value": "iOS"
        }
      ],
      "config": {
        "platform": "ios",
        "hapticFeedback": true
      },
      "composition": {
        "type": "mixin",
        "sourceRuleIds": ["analytics-mixin"]
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "ios-premium",
      "name": "iOS Premium Features",
      "priority": 15,
      "dependencies": ["ios-base"],
      "conditions": [
        {
          "type": "custom",
          "operator": "eq",
          "value": "premium"
        }
      ],
      "config": {},
      "composition": {
        "type": "extend",
        "baseRuleId": "ios-base",
        "overrides": {
          "composition": {
            "type": "mixin",
            "sourceRuleIds": ["premium-mixin"]
          }
        }
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ]
}
```

### Scenario 4: Time-Based Configuration

```json
{
  "rules": [
    {
      "id": "business-hours",
      "name": "Business Hours Config",
      "priority": 20,
      "conditions": [
        {
          "type": "time_after",
          "operator": "gte",
          "value": 1704096000000
        },
        {
          "type": "time_before",
          "operator": "lte",
          "value": 1704182400000
        }
      ],
      "config": {
        "supportAvailable": true,
        "responseTime": "immediate"
      },
      "resolutionStrategy": "merge",
      "enabled": true
    },
    {
      "id": "after-hours",
      "name": "After Hours Config",
      "priority": 15,
      "exclusions": ["business-hours"],
      "conditions": [],
      "config": {
        "supportAvailable": false,
        "responseTime": "next_business_day"
      },
      "resolutionStrategy": "merge",
      "enabled": true
    }
  ]
}
```

---

## Testing Conditional Rules

Test which rules would load for a given context:

```bash
POST /rules/test-conditions

{
  "appId": "mobile-app",
  "version": "1.0.0",
  "context": {
    "userAgent": "MyApp/1.0.0 (iOS 17.0)",
    "environment": "production",
    "featureFlags": {
      "new_ui": true
    },
    "userId": "test-user-123",
    "customContext": {
      "userTier": "premium"
    }
  }
}

// Response shows which conditional rules would load
```

---

## Best Practices

### 1. Rule Organization
- Use tags to group related rules
- Name rules descriptively
- Document complex chains in metadata

### 2. Performance
- Use conditional loading for rarely-used rules
- Leverage caching for expensive operations
- Keep rule conditions simple

### 3. Composition
- Create reusable templates for common patterns
- Use mixins for cross-cutting concerns
- Compose rules to reduce duplication

### 4. Testing
- Test rule compositions in isolation
- Verify conditional loading logic
- Validate against schema

### 5. Versioning
- Use semantic versioning for specifications
- Document breaking changes
- Maintain backward compatibility when possible
