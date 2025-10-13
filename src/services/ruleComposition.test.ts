import { describe, it, expect, beforeEach } from "vitest";
import { RuleComposer } from "./ruleComposition";
import {
  ConfigRule,
  RuleCondition,
  ResolutionStrategy,
  RuleChain,
  RuleComposition,
} from "../types";

describe("RuleComposer.applyMixin", () => {
  const GreenButtonRule: ConfigRule = {
    id: "dfcf7e8f-1b5d-4758-81c6-403a12934686",
    name: "Green Button Rule",
    priority: 1,
    conditions: [
      {
        type: "os",
        operator: "eq",
        value: "Mac OS X",
      },
    ],
    config: {
      "green-button-feature-flag": false,
    },
    enabled: true,
    tags: ["platform:IOS", "feature:Green Button"],
    metadata: {
      ruleType: "Feature flag",
    },
  };

  const AppAttestationOnMixinRule: ConfigRule = {
    id: "08a6f5b5-5140-497c-93e8-d42d0b6539b3",
    name: "App Attestation Mixin Rule",
    conditions: [],
    config: {
      appAttestation: true,
    },
    enabled: true,
    tags: ["platform:All", "feature:App Attestation"],
    metadata: {
      ruleType: "Feature flag",
    },
  } as ConfigRule;
  it("should apply mixin to rule", () => {
    const uut = new RuleComposer();
    const ruleWithMixin: ConfigRule = uut.applyMixin(
      GreenButtonRule,
      AppAttestationOnMixinRule,
    );

    // Assertions
    expect(ruleWithMixin.id).toBe(GreenButtonRule.id);
    expect(ruleWithMixin.config).toEqual({
      "green-button-feature-flag": false,
      appAttestation: true, // Mixin config merged
    });
    expect(ruleWithMixin.conditions).toHaveLength(1); // Original + mixin (empty array)
    expect(ruleWithMixin.tags).toContain("platform:IOS");
    expect(ruleWithMixin.tags).toContain("feature:App Attestation");
    expect(ruleWithMixin.tags).toContain("mixed");
    expect(ruleWithMixin.metadata?.mixins).toContain(
      AppAttestationOnMixinRule.id,
    );
  });
});

describe("RuleComposer.extendRule", () => {
  let composer: RuleComposer;
  // Base rule fixture
  const baseRule: ConfigRule = {
    id: "base-ios-rule",
    name: "Base iOS Rule",
    priority: 5,
    conditions: [
      {
        type: "os" as RuleConditionType,
        operator: "eq",
        value: "iOS",
      },
    ],
    config: {
      theme: "light",
      debugMode: false,
      maxRetries: 3,
    },
    resolutionStrategy: "merge",
    enabled: true,
    tags: ["platform:iOS", "environment:prod"],
    metadata: {
      author: "platform-team",
      version: "1.0",
    },
  };
  beforeEach(() => {
    composer = new RuleComposer();
  });
  it("should extend a base rule with new config values", () => {
    const overrides: Partial<ConfigRule> = {
      config: {
        debugMode: true,
        logLevel: "verbose",
      },
    };

    const extendedRule = composer.extendRule(baseRule, overrides);

    // Should merge configs
    expect(extendedRule.config).toEqual({
      theme: "light",
      debugMode: true, // Overridden
      maxRetries: 3,
      logLevel: "verbose", // Added
    });

    // Should generate new ID
    expect(extendedRule.id).toBe("base-ios-rule-extended");

    // Should keep other properties from base
    expect(extendedRule.name).toBe(baseRule.name);
    expect(extendedRule.priority).toBe(baseRule.priority);
    expect(extendedRule.conditions).toBe(baseRule.conditions);
  });
  it("should override conditions when provided", () => {
    const overrides: Partial<ConfigRule> = {
      conditions: [
        {
          type: "app_version" as RuleConditionType,
          operator: "gte",
          value: "2.0.0",
        },
      ],
    };

    const extendedRule = composer.extendRule(baseRule, overrides);

    expect(extendedRule.conditions).toHaveLength(1);
    expect(extendedRule.conditions[0].type).toBe("app_version");
    expect(extendedRule.conditions[0].value).toBe("2.0.0");
  });
  it("should use custom ID when provided in overrides", () => {
    const overrides: Partial<ConfigRule> = {
      id: "custom-extended-id",
      config: {
        debugMode: true,
      },
    };

    const extendedRule = composer.extendRule(baseRule, overrides);

    expect(extendedRule.id).toBe("custom-extended-id");
  });
  it("should merge metadata and add extendedFrom reference", () => {
    const overrides: Partial<ConfigRule> = {
      metadata: {
        customField: "custom-value",
        version: "2.0", // Override existing
      },
    };

    const extendedRule = composer.extendRule(baseRule, overrides);

    expect(extendedRule.metadata).toEqual({
      author: "platform-team",
      version: "2.0", // Overridden
      customField: "custom-value", // Added
      extendedFrom: baseRule.id, // Automatically added
    });
  });
  it("should override priority when provided", () => {
    const overrides: Partial<ConfigRule> = {
      priority: 10,
    };

    const extendedRule = composer.extendRule(baseRule, overrides);

    expect(extendedRule.priority).toBe(10);
  });
  it("should override resolution strategy when provided", () => {
    const overrides: Partial<ConfigRule> = {
      resolutionStrategy: "override",
    };

    const extendedRule = composer.extendRule(baseRule, overrides);

    expect(extendedRule.resolutionStrategy).toBe("override");
  });
  it("should extend rule with additional tags", () => {
    const overrides: Partial<ConfigRule> = {
      tags: ["feature:new-feature", "team:mobile"],
    };

    const extendedRule = composer.extendRule(baseRule, overrides);

    expect(extendedRule.tags).toEqual(["feature:new-feature", "team:mobile"]);
  });
  it("should extend rule with dependencies", () => {
    const overrides: Partial<ConfigRule> = {
      dependencies: ["rule-1", "rule-2"],
    };

    const extendedRule = composer.extendRule(baseRule, overrides);

    expect(extendedRule.dependencies).toEqual(["rule-1", "rule-2"]);
  });
  it("should extend rule with complex nested config", () => {
    const baseWithNestedConfig: ConfigRule = {
      ...baseRule,
      config: {
        api: {
          endpoint: "https://api.example.com",
          timeout: 5000,
          retries: 3,
        },
        features: {
          featureA: true,
          featureB: false,
        },
      },
    };

    const overrides: Partial<ConfigRule> = {
      config: {
        api: {
          timeout: 10000, // Override nested value
          headers: { "X-Custom": "value" }, // Add nested value
        },
        features: {
          featureB: true, // Override nested value
        },
      },
    };

    const extendedRule = composer.extendRule(baseWithNestedConfig, overrides);

    expect(extendedRule.config).toEqual({
      api: {
        endpoint: "https://api.example.com",
        timeout: 10000, // Overridden
        retries: 3,
        headers: { "X-Custom": "value" }, // Added
      },
      features: {
        featureA: true,
        featureB: true, // Overridden
      },
    });
  });
  it("should preserve base rule immutability", () => {
    const originalConfig = { ...baseRule.config };

    const overrides: Partial<ConfigRule> = {
      config: {
        debugMode: true,
      },
    };

    composer.extendRule(baseRule, overrides);

    // Base rule should not be modified
    expect(baseRule.config).toEqual(originalConfig);
  });

  it("should handle empty overrides", () => {
    const overrides: Partial<ConfigRule> = {};

    const extendedRule = composer.extendRule(baseRule, overrides);

    expect(extendedRule.id).toBe("base-ios-rule-extended");
    expect(extendedRule.config).toEqual(baseRule.config);
    expect(extendedRule.metadata?.extendedFrom).toBe(baseRule.id);
  });

  it("should extend disabled rule", () => {
    const disabledBase: ConfigRule = {
      ...baseRule,
      enabled: false,
    };

    const overrides: Partial<ConfigRule> = {
      enabled: true,
    };

    const extendedRule = composer.extendRule(disabledBase, overrides);

    expect(extendedRule.enabled).toBe(true);
  });
});
