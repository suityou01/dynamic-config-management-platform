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
  let composer: RuleComposer;
  let targetRule: ConfigRule;
  let mixinRule: ConfigRule;

  beforeEach(() => {
    composer = new RuleComposer();

    targetRule = {
      id: "target-rule",
      name: "Target Rule",
      priority: 10,
      conditions: [{ type: "os", operator: "eq", value: "iOS" }],
      config: {
        feature1: true,
        nested: {
          targetValue: "original",
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
      tags: ["target"],
    };

    mixinRule = {
      id: "mixin-rule",
      name: "Mixin Rule",
      priority: 5,
      conditions: [{ type: "geo_country", operator: "eq", value: "US" }],
      config: {
        mixinFeature: true,
        nested: {
          mixinValue: "added",
          targetValue: "overridden",
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
      tags: ["mixin"],
    };
  });

  it("should merge mixin config into target config", () => {
    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.config.feature1).toBe(true);
    expect(result.config.mixinFeature).toBe(true);
  });

  it("should deeply merge nested config", () => {
    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.config.nested.targetValue).toBe("overridden");
    expect(result.config.nested.mixinValue).toBe("added");
  });

  it("should append mixin conditions to target conditions", () => {
    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.conditions).toHaveLength(2);
    expect(result.conditions[0]).toEqual({
      type: "os",
      operator: "eq",
      value: "iOS",
    });
    expect(result.conditions[1]).toEqual({
      type: "geo_country",
      operator: "eq",
      value: "US",
    });
  });

  it("should combine tags from target and mixin", () => {
    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.tags).toContain("target");
    expect(result.tags).toContain("mixin");
    expect(result.tags).toContain("mixed");
  });

  it("should always add mixed tag", () => {
    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.tags).toContain("mixed");
  });

  it("should track mixins in metadata", () => {
    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.metadata?.mixins).toContain("mixin-rule");
  });

  it("should append to existing mixins in metadata", () => {
    targetRule.metadata = {
      mixins: ["existing-mixin"],
    };

    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.metadata?.mixins).toContain("existing-mixin");
    expect(result.metadata?.mixins).toContain("mixin-rule");
    expect(result.metadata?.mixins).toHaveLength(2);
  });

  it("should preserve target rule properties", () => {
    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.id).toBe("target-rule");
    expect(result.name).toBe("Target Rule");
    expect(result.priority).toBe(10);
    expect(result.resolutionStrategy).toBe("merge");
    expect(result.enabled).toBe(true);
  });

  it("should handle target with no tags", () => {
    delete targetRule.tags;

    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.tags).toContain("mixin");
    expect(result.tags).toContain("mixed");
  });

  it("should handle mixin with no tags", () => {
    delete mixinRule.tags;

    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.tags).toContain("target");
    expect(result.tags).toContain("mixed");
  });

  it("should handle both with no tags", () => {
    delete targetRule.tags;
    delete mixinRule.tags;

    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.tags).toEqual(["mixed"]);
  });

  it("should apply multiple mixins sequentially", () => {
    const mixin2: ConfigRule = {
      id: "mixin-2",
      name: "Mixin 2",
      priority: 5,
      conditions: [{ type: "device", operator: "eq", value: "mobile" }],
      config: {
        mixin2Feature: true,
      },
      resolutionStrategy: "merge",
      enabled: true,
      tags: ["mixin2"],
    };

    let result = composer.applyMixin(targetRule, mixinRule);
    result = composer.applyMixin(result, mixin2);

    expect(result.config.feature1).toBe(true);
    expect(result.config.mixinFeature).toBe(true);
    expect(result.config.mixin2Feature).toBe(true);
    expect(result.conditions).toHaveLength(3);
    expect(result.metadata?.mixins).toEqual(["mixin-rule", "mixin-2"]);
  });

  it("should handle empty conditions in target", () => {
    targetRule.conditions = [];

    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toEqual(mixinRule.conditions[0]);
  });

  it("should handle empty conditions in mixin", () => {
    mixinRule.conditions = [];

    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toEqual(targetRule.conditions[0]);
  });

  it("should preserve other metadata fields", () => {
    targetRule.metadata = {
      version: "1.0",
      author: "test-author",
    };

    const result = composer.applyMixin(targetRule, mixinRule);

    expect(result.metadata?.version).toBe("1.0");
    expect(result.metadata?.author).toBe("test-author");
    expect(result.metadata?.mixins).toContain("mixin-rule");
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

describe("RuleComposer.composeRules", () => {
  let composer: RuleComposer;
  let baseRule1: ConfigRule;
  let baseRule2: ConfigRule;
  let baseRule3: ConfigRule;

  beforeEach(() => {
    composer = new RuleComposer();

    baseRule1 = {
      id: "rule-1",
      name: "Rule 1",
      description: "First rule",
      priority: 10,
      conditions: [{ type: "os", operator: "eq", value: "iOS" }],
      config: {
        feature1: true,
        nested: {
          value: "from-rule-1",
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
      tags: ["mobile", "ios"],
      dependencies: ["base-rule"],
    };

    baseRule2 = {
      id: "rule-2",
      name: "Rule 2",
      description: "Second rule",
      priority: 15,
      conditions: [{ type: "geo_country", operator: "eq", value: "US" }],
      config: {
        feature2: true,
        nested: {
          value: "from-rule-2",
          extra: "additional",
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
      tags: ["geo", "us"],
      exclusions: ["free-tier"],
    };

    baseRule3 = {
      id: "rule-3",
      name: "Rule 3",
      description: "Third rule",
      priority: 5,
      conditions: [{ type: "app_version", operator: "gte", value: "2.0.0" }],
      config: {
        feature3: true,
        apiUrl: "https://api.example.com",
      },
      resolutionStrategy: "merge",
      enabled: false,
      tags: ["version"],
    };
  });

  it("should throw error when composing empty rule set", () => {
    expect(() => {
      composer.composeRules([], "new-rule");
    }).toThrow("Cannot compose empty rule set");
  });

  it("should compose two rules with merge strategy", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "merge",
    );

    expect(result.id).toBe("composed-rule");
    expect(result.name).toBe("Composed: Rule 1 + Rule 2");
    expect(result.description).toBe("Composed from: rule-1, rule-2");
    expect(result.resolutionStrategy).toBe("merge");
  });

  it("should merge configs from multiple rules with merge strategy", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "merge",
    );

    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
    expect(result.config.nested.value).toBe("from-rule-2");
    expect(result.config.nested.extra).toBe("additional");
  });

  it("should merge configs with override strategy", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "override",
    );

    // Override should take last rule's config
    expect(result.config.feature1).toBeUndefined();
    expect(result.config.feature2).toBe(true);
    expect(result.config.nested.value).toBe("from-rule-2");
  });

  it("should merge configs with inherit strategy", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "inherit",
    );

    // Inherit should prefer first rule's values
    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
    expect(result.config.nested.value).toBe("from-rule-1");
  });

  it("should combine all conditions from source rules", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2, baseRule3],
      "composed-rule",
    );

    expect(result.conditions).toHaveLength(3);
    expect(result.conditions[0]).toEqual({
      type: "os",
      operator: "eq",
      value: "iOS",
    });
    expect(result.conditions[1]).toEqual({
      type: "geo_country",
      operator: "eq",
      value: "US",
    });
    expect(result.conditions[2]).toEqual({
      type: "app_version",
      operator: "gte",
      value: "2.0.0",
    });
  });

  it("should use highest priority from source rules", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2, baseRule3],
      "composed-rule",
    );

    expect(result.priority).toBe(15); // Highest from baseRule2
  });

  it("should combine all dependencies from source rules", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
    );

    expect(result.dependencies).toContain("base-rule");
    expect(result.dependencies).toHaveLength(1);
  });

  it("should combine all exclusions from source rules", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
    );

    expect(result.exclusions).toContain("free-tier");
    expect(result.exclusions).toHaveLength(1);
  });

  it("should combine all tags from source rules without duplicates", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2, baseRule3],
      "composed-rule",
    );

    expect(result.tags).toContain("mobile");
    expect(result.tags).toContain("ios");
    expect(result.tags).toContain("geo");
    expect(result.tags).toContain("us");
    expect(result.tags).toContain("version");
    expect(result.tags).toHaveLength(5);
  });

  it("should only be enabled if all source rules are enabled", () => {
    const result1 = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule-1",
    );
    expect(result1.enabled).toBe(true);

    const result2 = composer.composeRules(
      [baseRule1, baseRule2, baseRule3],
      "composed-rule-2",
    );
    expect(result2.enabled).toBe(false); // baseRule3 is disabled
  });

  it("should include metadata about composition", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "merge",
    );

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.composedFrom).toEqual(["rule-1", "rule-2"]);
    expect(result.metadata?.compositionStrategy).toBe("merge");
  });

  it("should handle single rule composition", () => {
    const result = composer.composeRules([baseRule1], "single-composed-rule");

    expect(result.id).toBe("single-composed-rule");
    expect(result.config).toEqual(baseRule1.config);
    expect(result.conditions).toEqual(baseRule1.conditions);
    expect(result.priority).toBe(10);
  });

  it("should handle rules with no dependencies or exclusions", () => {
    const simpleRule1: ConfigRule = {
      id: "simple-1",
      name: "Simple 1",
      priority: 10,
      conditions: [],
      config: { value: 1 },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const simpleRule2: ConfigRule = {
      id: "simple-2",
      name: "Simple 2",
      priority: 20,
      conditions: [],
      config: { value: 2 },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.composeRules(
      [simpleRule1, simpleRule2],
      "composed-simple",
    );

    expect(result.dependencies).toEqual([]);
    expect(result.exclusions).toEqual([]);
  });

  it("should handle rules with no tags", () => {
    const noTagRule1: ConfigRule = {
      id: "no-tag-1",
      name: "No Tag 1",
      priority: 10,
      conditions: [],
      config: { value: 1 },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const noTagRule2: ConfigRule = {
      id: "no-tag-2",
      name: "No Tag 2",
      priority: 20,
      conditions: [],
      config: { value: 2 },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.composeRules(
      [noTagRule1, noTagRule2],
      "composed-no-tags",
    );

    expect(result.tags).toEqual([]);
  });

  it("should deeply merge nested objects in configs", () => {
    const rule1: ConfigRule = {
      id: "nested-1",
      name: "Nested 1",
      priority: 10,
      conditions: [],
      config: {
        deep: {
          level1: {
            level2: {
              value: "original",
              keep: true,
            },
          },
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const rule2: ConfigRule = {
      id: "nested-2",
      name: "Nested 2",
      priority: 20,
      conditions: [],
      config: {
        deep: {
          level1: {
            level2: {
              value: "updated",
            },
            newKey: "added",
          },
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.composeRules(
      [rule1, rule2],
      "deep-merged",
      "merge",
    );

    expect(result.config.deep.level1.level2.value).toBe("updated");
    expect(result.config.deep.level1.level2.keep).toBe(true);
    expect(result.config.deep.level1.newKey).toBe("added");
  });

  it("should remove duplicate dependencies", () => {
    const rule1: ConfigRule = {
      id: "dup-1",
      name: "Dup 1",
      priority: 10,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
      dependencies: ["dep-a", "dep-b"],
    };

    const rule2: ConfigRule = {
      id: "dup-2",
      name: "Dup 2",
      priority: 20,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
      dependencies: ["dep-b", "dep-c"],
    };

    const result = composer.composeRules([rule1, rule2], "no-duplicates");

    expect(result.dependencies).toHaveLength(3);
    expect(result.dependencies).toContain("dep-a");
    expect(result.dependencies).toContain("dep-b");
    expect(result.dependencies).toContain("dep-c");
  });

  it("should remove duplicate exclusions", () => {
    const rule1: ConfigRule = {
      id: "exc-1",
      name: "Exc 1",
      priority: 10,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
      exclusions: ["exc-a", "exc-b"],
    };

    const rule2: ConfigRule = {
      id: "exc-2",
      name: "Exc 2",
      priority: 20,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
      exclusions: ["exc-b", "exc-c"],
    };

    const result = composer.composeRules([rule1, rule2], "no-dup-exclusions");

    expect(result.exclusions).toHaveLength(3);
    expect(result.exclusions).toContain("exc-a");
    expect(result.exclusions).toContain("exc-b");
    expect(result.exclusions).toContain("exc-c");
  });

  it("should handle array values in config correctly", () => {
    const rule1: ConfigRule = {
      id: "array-1",
      name: "Array 1",
      priority: 10,
      conditions: [],
      config: {
        items: [1, 2, 3],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const rule2: ConfigRule = {
      id: "array-2",
      name: "Array 2",
      priority: 20,
      conditions: [],
      config: {
        items: [4, 5, 6],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.composeRules(
      [rule1, rule2],
      "array-merged",
      "merge",
    );

    // Arrays should be replaced, not merged
    expect(result.config.items).toEqual([4, 5, 6]);
  });

  it("should default to merge strategy when not specified", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "default-strategy",
    );

    expect(result.resolutionStrategy).toBe("merge");
    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
  });
});

describe("RuleComposer.composeRules", () => {
  let composer: RuleComposer;
  let baseRule1: ConfigRule;
  let baseRule2: ConfigRule;
  let baseRule3: ConfigRule;

  beforeEach(() => {
    composer = new RuleComposer();

    baseRule1 = {
      id: "rule-1",
      name: "Rule 1",
      description: "First rule",
      priority: 10,
      conditions: [{ type: "os", operator: "eq", value: "iOS" }],
      config: {
        feature1: true,
        nested: {
          value: "from-rule-1",
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
      tags: ["mobile", "ios"],
      dependencies: ["base-rule"],
    };

    baseRule2 = {
      id: "rule-2",
      name: "Rule 2",
      description: "Second rule",
      priority: 15,
      conditions: [{ type: "geo_country", operator: "eq", value: "US" }],
      config: {
        feature2: true,
        nested: {
          value: "from-rule-2",
          extra: "additional",
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
      tags: ["geo", "us"],
      exclusions: ["free-tier"],
    };

    baseRule3 = {
      id: "rule-3",
      name: "Rule 3",
      description: "Third rule",
      priority: 5,
      conditions: [{ type: "app_version", operator: "gte", value: "2.0.0" }],
      config: {
        feature3: true,
        apiUrl: "https://api.example.com",
      },
      resolutionStrategy: "merge",
      enabled: false,
      tags: ["version"],
    };
  });

  it("should throw error when composing empty rule set", () => {
    expect(() => {
      composer.composeRules([], "new-rule");
    }).toThrow("Cannot compose empty rule set");
  });

  it("should compose two rules with merge strategy", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "merge",
    );

    expect(result.id).toBe("composed-rule");
    expect(result.name).toBe("Composed: Rule 1 + Rule 2");
    expect(result.description).toBe("Composed from: rule-1, rule-2");
    expect(result.resolutionStrategy).toBe("merge");
  });

  it("should merge configs from multiple rules with merge strategy", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "merge",
    );

    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
    expect(result.config.nested.value).toBe("from-rule-2");
    expect(result.config.nested.extra).toBe("additional");
  });

  it("should merge configs with override strategy", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "override",
    );

    // Override should take last rule's config
    expect(result.config.feature1).toBeUndefined();
    expect(result.config.feature2).toBe(true);
    expect(result.config.nested.value).toBe("from-rule-2");
  });

  it("should merge configs with inherit strategy", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "inherit",
    );

    // Inherit should prefer first rule's values
    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
    expect(result.config.nested.value).toBe("from-rule-1");
  });

  it("should combine all conditions from source rules", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2, baseRule3],
      "composed-rule",
    );

    expect(result.conditions).toHaveLength(3);
    expect(result.conditions[0]).toEqual({
      type: "os",
      operator: "eq",
      value: "iOS",
    });
    expect(result.conditions[1]).toEqual({
      type: "geo_country",
      operator: "eq",
      value: "US",
    });
    expect(result.conditions[2]).toEqual({
      type: "app_version",
      operator: "gte",
      value: "2.0.0",
    });
  });

  it("should use highest priority from source rules", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2, baseRule3],
      "composed-rule",
    );

    expect(result.priority).toBe(15); // Highest from baseRule2
  });

  it("should combine all dependencies from source rules", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
    );

    expect(result.dependencies).toContain("base-rule");
    expect(result.dependencies).toHaveLength(1);
  });

  it("should combine all exclusions from source rules", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
    );

    expect(result.exclusions).toContain("free-tier");
    expect(result.exclusions).toHaveLength(1);
  });

  it("should combine all tags from source rules without duplicates", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2, baseRule3],
      "composed-rule",
    );

    expect(result.tags).toContain("mobile");
    expect(result.tags).toContain("ios");
    expect(result.tags).toContain("geo");
    expect(result.tags).toContain("us");
    expect(result.tags).toContain("version");
    expect(result.tags).toHaveLength(5);
  });

  it("should only be enabled if all source rules are enabled", () => {
    const result1 = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule-1",
    );
    expect(result1.enabled).toBe(true);

    const result2 = composer.composeRules(
      [baseRule1, baseRule2, baseRule3],
      "composed-rule-2",
    );
    expect(result2.enabled).toBe(false); // baseRule3 is disabled
  });

  it("should include metadata about composition", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "composed-rule",
      "merge",
    );

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.composedFrom).toEqual(["rule-1", "rule-2"]);
    expect(result.metadata?.compositionStrategy).toBe("merge");
  });

  it("should handle single rule composition", () => {
    const result = composer.composeRules([baseRule1], "single-composed-rule");

    expect(result.id).toBe("single-composed-rule");
    expect(result.config).toEqual(baseRule1.config);
    expect(result.conditions).toEqual(baseRule1.conditions);
    expect(result.priority).toBe(10);
  });

  it("should handle rules with no dependencies or exclusions", () => {
    const simpleRule1: ConfigRule = {
      id: "simple-1",
      name: "Simple 1",
      priority: 10,
      conditions: [],
      config: { value: 1 },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const simpleRule2: ConfigRule = {
      id: "simple-2",
      name: "Simple 2",
      priority: 20,
      conditions: [],
      config: { value: 2 },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.composeRules(
      [simpleRule1, simpleRule2],
      "composed-simple",
    );

    expect(result.dependencies).toEqual([]);
    expect(result.exclusions).toEqual([]);
  });

  it("should handle rules with no tags", () => {
    const noTagRule1: ConfigRule = {
      id: "no-tag-1",
      name: "No Tag 1",
      priority: 10,
      conditions: [],
      config: { value: 1 },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const noTagRule2: ConfigRule = {
      id: "no-tag-2",
      name: "No Tag 2",
      priority: 20,
      conditions: [],
      config: { value: 2 },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.composeRules(
      [noTagRule1, noTagRule2],
      "composed-no-tags",
    );

    expect(result.tags).toEqual([]);
  });

  it("should deeply merge nested objects in configs", () => {
    const rule1: ConfigRule = {
      id: "nested-1",
      name: "Nested 1",
      priority: 10,
      conditions: [],
      config: {
        deep: {
          level1: {
            level2: {
              value: "original",
              keep: true,
            },
          },
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const rule2: ConfigRule = {
      id: "nested-2",
      name: "Nested 2",
      priority: 20,
      conditions: [],
      config: {
        deep: {
          level1: {
            level2: {
              value: "updated",
            },
            newKey: "added",
          },
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.composeRules(
      [rule1, rule2],
      "deep-merged",
      "merge",
    );

    expect(result.config.deep.level1.level2.value).toBe("updated");
    expect(result.config.deep.level1.level2.keep).toBe(true);
    expect(result.config.deep.level1.newKey).toBe("added");
  });

  it("should remove duplicate dependencies", () => {
    const rule1: ConfigRule = {
      id: "dup-1",
      name: "Dup 1",
      priority: 10,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
      dependencies: ["dep-a", "dep-b"],
    };

    const rule2: ConfigRule = {
      id: "dup-2",
      name: "Dup 2",
      priority: 20,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
      dependencies: ["dep-b", "dep-c"],
    };

    const result = composer.composeRules([rule1, rule2], "no-duplicates");

    expect(result.dependencies).toHaveLength(3);
    expect(result.dependencies).toContain("dep-a");
    expect(result.dependencies).toContain("dep-b");
    expect(result.dependencies).toContain("dep-c");
  });

  it("should remove duplicate exclusions", () => {
    const rule1: ConfigRule = {
      id: "exc-1",
      name: "Exc 1",
      priority: 10,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
      exclusions: ["exc-a", "exc-b"],
    };

    const rule2: ConfigRule = {
      id: "exc-2",
      name: "Exc 2",
      priority: 20,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
      exclusions: ["exc-b", "exc-c"],
    };

    const result = composer.composeRules([rule1, rule2], "no-dup-exclusions");

    expect(result.exclusions).toHaveLength(3);
    expect(result.exclusions).toContain("exc-a");
    expect(result.exclusions).toContain("exc-b");
    expect(result.exclusions).toContain("exc-c");
  });

  it("should handle array values in config correctly", () => {
    const rule1: ConfigRule = {
      id: "array-1",
      name: "Array 1",
      priority: 10,
      conditions: [],
      config: {
        items: [1, 2, 3],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const rule2: ConfigRule = {
      id: "array-2",
      name: "Array 2",
      priority: 20,
      conditions: [],
      config: {
        items: [4, 5, 6],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.composeRules(
      [rule1, rule2],
      "array-merged",
      "merge",
    );

    // Arrays should be replaced, not merged
    expect(result.config.items).toEqual([4, 5, 6]);
  });

  it("should default to merge strategy when not specified", () => {
    const result = composer.composeRules(
      [baseRule1, baseRule2],
      "default-strategy",
    );

    expect(result.resolutionStrategy).toBe("merge");
    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
  });
});

describe("RuleComposer.createFromTemplate", () => {
  let composer: RuleComposer;

  beforeEach(() => {
    composer = new RuleComposer();
  });

  it("should throw error when template not found", () => {
    expect(() => {
      composer.createFromTemplate("non-existent-template", { id: "new-rule" });
    }).toThrow("Template not found: non-existent-template");
  });

  it("should throw error when rule ID not provided in overrides", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Test Template",
        priority: 10,
      },
    });

    expect(() => {
      composer.createFromTemplate("test-template", {});
    }).toThrow("Rule ID must be provided when creating from template");
  });

  it("should create rule from basic template", () => {
    const template = {
      name: "Template Name",
      description: "Template Description",
      priority: 10,
      conditions: [
        { type: "os" as const, operator: "eq" as const, value: "iOS" },
      ],
      config: {
        feature1: true,
        apiUrl: "https://template.example.com",
      },
      resolutionStrategy: "merge" as const,
      enabled: true,
    };

    composer.registerTemplates({ "basic-template": template });

    const result = composer.createFromTemplate("basic-template", {
      id: "new-rule-1",
    });

    expect(result.id).toBe("new-rule-1");
    expect(result.name).toBe("Template Name");
    expect(result.description).toBe("Template Description");
    expect(result.priority).toBe(10);
    expect(result.conditions).toEqual(template.conditions);
    expect(result.config).toEqual(template.config);
    expect(result.resolutionStrategy).toBe("merge");
    expect(result.enabled).toBe(true);
  });

  it("should override template name with provided name", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template Name",
        priority: 10,
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      name: "Custom Name",
    });

    expect(result.name).toBe("Custom Name");
  });

  it("should override template description", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        description: "Original description",
        priority: 10,
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      description: "Custom description",
    });

    expect(result.description).toBe("Custom description");
  });

  it("should override template priority", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      priority: 50,
    });

    expect(result.priority).toBe(50);
  });

  it("should override template conditions", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        conditions: [
          { type: "os" as const, operator: "eq" as const, value: "iOS" },
        ],
      },
    });

    const newConditions = [
      { type: "os" as const, operator: "eq" as const, value: "Android" },
      { type: "geo_country" as const, operator: "eq" as const, value: "US" },
    ];

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      conditions: newConditions,
    });

    expect(result.conditions).toEqual(newConditions);
  });

  it("should merge template config with override config", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        config: {
          feature1: true,
          feature2: false,
          apiUrl: "https://template.example.com",
        },
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      config: {
        feature2: true,
        feature3: "new",
      },
    });
    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
    expect(result.config.feature3).toBe("new");
    expect(result.config.apiUrl).toBe("https://template.example.com");
  });

  it("should override template resolutionStrategy", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        resolutionStrategy: "merge" as const,
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      resolutionStrategy: "override",
    });

    expect(result.resolutionStrategy).toBe("override");
  });

  it("should override template enabled state", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        enabled: true,
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      enabled: false,
    });

    expect(result.enabled).toBe(false);
  });

  it("should use default values when template fields are missing", () => {
    composer.registerTemplates({
      "minimal-template": {},
    });

    const result = composer.createFromTemplate("minimal-template", {
      id: "new-rule",
      name: "Custom Name",
    });

    expect(result.id).toBe("new-rule");
    expect(result.name).toBe("Custom Name");
    expect(result.priority).toBe(0);
    expect(result.conditions).toEqual([]);
    expect(result.resolutionStrategy).toBe("merge");
    expect(result.enabled).toBe(true);
  });

  it("should handle template with dependencies", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        dependencies: ["dep-1", "dep-2"],
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.dependencies).toEqual(["dep-1", "dep-2"]);
  });

  it("should override template dependencies", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        dependencies: ["dep-1", "dep-2"],
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      dependencies: ["dep-3"],
    });

    expect(result.dependencies).toEqual(["dep-3"]);
  });

  it("should handle template with exclusions", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        exclusions: ["exc-1", "exc-2"],
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.exclusions).toEqual(["exc-1", "exc-2"]);
  });

  it("should handle template with tags", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        tags: ["mobile", "premium"],
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.tags).toEqual(["mobile", "premium"]);
  });

  it("should override template tags", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        tags: ["mobile", "premium"],
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      tags: ["web", "free"],
    });

    expect(result.tags).toEqual(["web", "free"]);
  });

  it("should merge template metadata with override metadata", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        metadata: {
          templateVersion: "1.0",
          author: "template-author",
        },
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      metadata: {
        author: "override-author",
        createdDate: "2024-01-01",
      },
    });

    expect(result.metadata?.templateVersion).toBe("1.0");
    expect(result.metadata?.author).toBe("override-author");
    expect(result.metadata?.createdDate).toBe("2024-01-01");
    expect(result.metadata?.createdFromTemplate).toBe("test-template");
  });

  it("should always add createdFromTemplate to metadata", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.metadata?.createdFromTemplate).toBe("test-template");
  });

  it("should handle template with chain configuration", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        chain: {
          operator: "AND" as const,
          rules: ["rule-1", "rule-2"],
        },
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.chain).toEqual({
      operator: "AND",
      rules: ["rule-1", "rule-2"],
    });
  });

  it("should override template chain", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        chain: {
          operator: "AND" as const,
          rules: ["rule-1", "rule-2"],
        },
      },
    });

    const newChain = {
      operator: "OR" as const,
      rules: ["rule-3", "rule-4"],
    };

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      chain: newChain,
    });

    expect(result.chain).toEqual(newChain);
  });

  it("should handle template with executeAfter", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        executeAfter: ["setup-rule"],
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.executeAfter).toEqual(["setup-rule"]);
  });

  it("should handle template with executeBefore", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        executeBefore: ["cleanup-rule"],
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.executeBefore).toEqual(["cleanup-rule"]);
  });

  it("should handle template with stopPropagation", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        stopPropagation: true,
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.stopPropagation).toBe(true);
  });

  it("should create multiple rules from same template", () => {
    composer.registerTemplates({
      "geo-template": {
        name: "Geo Template",
        priority: 10,
        conditions: [
          {
            type: "geo_country" as const,
            operator: "eq" as const,
            value: "PLACEHOLDER",
          },
        ],
        config: {
          language: "en",
        },
        resolutionStrategy: "merge" as const,
      },
    });

    const usRule = composer.createFromTemplate("geo-template", {
      id: "us-rule",
      name: "US Config",
      conditions: [
        { type: "geo_country" as const, operator: "eq" as const, value: "US" },
      ],
      config: {
        currency: "USD",
      },
    });

    const ukRule = composer.createFromTemplate("geo-template", {
      id: "uk-rule",
      name: "UK Config",
      conditions: [
        { type: "geo_country" as const, operator: "eq" as const, value: "GB" },
      ],
      config: {
        currency: "GBP",
      },
    });

    expect(usRule.id).toBe("us-rule");
    expect(usRule.name).toBe("US Config");
    expect(usRule.config.language).toBe("en");
    expect(usRule.config.currency).toBe("USD");

    expect(ukRule.id).toBe("uk-rule");
    expect(ukRule.name).toBe("UK Config");
    expect(ukRule.config.language).toBe("en");
    expect(ukRule.config.currency).toBe("GBP");
  });

  it("should handle deeply nested config override", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        config: {
          level1: {
            level2: {
              level3: {
                value: "template",
                keep: true,
              },
            },
          },
        },
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
      config: {
        level1: {
          level2: {
            level3: {
              value: "override",
              newKey: "added",
            },
          },
        },
      },
    });

    expect(result.config.level1.level2.level3.value).toBe("override");
    expect(result.config.level1.level2.level3.keep).toBe(true);
    expect(result.config.level1.level2.level3.newKey).toBe("added");
  });

  it("should use 'Unnamed Rule' as default name when not provided", () => {
    composer.registerTemplates({
      "test-template": {
        priority: 10,
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.name).toBe("Unnamed Rule");
  });

  it("should handle template with composition property", () => {
    composer.registerTemplates({
      "test-template": {
        name: "Template",
        priority: 10,
        composition: {
          type: "extend" as const,
          baseRuleId: "base-rule",
        },
      },
    });

    const result = composer.createFromTemplate("test-template", {
      id: "new-rule",
    });

    expect(result.composition).toEqual({
      type: "extend",
      baseRuleId: "base-rule",
    });
  });
});

describe("RuleComposer.processComposition", () => {
  let composer: RuleComposer;
  let allRules: ConfigRule[];

  beforeEach(() => {
    composer = new RuleComposer();

    allRules = [
      {
        id: "base-rule",
        name: "Base Rule",
        priority: 10,
        conditions: [],
        config: {
          baseFeature: true,
          value: "base",
        },
        resolutionStrategy: "merge",
        enabled: true,
      },
      {
        id: "source-1",
        name: "Source 1",
        priority: 15,
        conditions: [{ type: "os", operator: "eq", value: "iOS" }],
        config: {
          feature1: true,
        },
        resolutionStrategy: "merge",
        enabled: true,
      },
      {
        id: "source-2",
        name: "Source 2",
        priority: 20,
        conditions: [{ type: "geo_country", operator: "eq", value: "US" }],
        config: {
          feature2: true,
        },
        resolutionStrategy: "merge",
        enabled: true,
      },
      {
        id: "mixin-rule",
        name: "Mixin Rule",
        priority: 5,
        conditions: [],
        config: {
          mixinFeature: true,
        },
        resolutionStrategy: "merge",
        enabled: true,
        tags: ["mixin"],
      },
    ];
  });

  it("should return rule unchanged when no composition", () => {
    const rule: ConfigRule = {
      id: "simple-rule",
      name: "Simple Rule",
      priority: 10,
      conditions: [],
      config: {},
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.processComposition(rule, allRules);

    expect(result).toEqual(rule);
  });

  it("should process extend composition", () => {
    const rule: ConfigRule = {
      id: "extended-rule",
      name: "Extended Rule",
      priority: 25,
      conditions: [],
      config: {
        extendedFeature: true,
      },
      composition: {
        type: "extend",
        baseRuleId: "base-rule",
        overrides: {
          priority: 30,
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.processComposition(rule, allRules);

    expect(result.id).toBe("extended-rule");
    expect(result.config.baseFeature).toBe(true);
    expect(result.config.extendedFeature).toBe(true);
    expect(result.priority).toBe(30);
  });

  it("should throw error for extend with missing baseRuleId", () => {
    const rule: ConfigRule = {
      id: "extended-rule",
      name: "Extended Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "extend",
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    expect(() => {
      composer.processComposition(rule, allRules);
    }).toThrow("baseRuleId required for extend composition");
  });

  it("should throw error for extend with non-existent base rule", () => {
    const rule: ConfigRule = {
      id: "extended-rule",
      name: "Extended Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "extend",
        baseRuleId: "non-existent",
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    expect(() => {
      composer.processComposition(rule, allRules);
    }).toThrow("Base rule not found: non-existent");
  });

  it("should process compose composition", () => {
    const rule: ConfigRule = {
      id: "composed-rule",
      name: "Composed Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "compose",
        sourceRuleIds: ["source-1", "source-2"],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.processComposition(rule, allRules);

    expect(result.id).toBe("composed-rule");
    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
    expect(result.conditions).toHaveLength(2);
  });

  it("should throw error for compose with missing sourceRuleIds", () => {
    const rule: ConfigRule = {
      id: "composed-rule",
      name: "Composed Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "compose",
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    expect(() => {
      composer.processComposition(rule, allRules);
    }).toThrow("sourceRuleIds required for compose composition");
  });

  it("should throw error for compose with empty sourceRuleIds", () => {
    const rule: ConfigRule = {
      id: "composed-rule",
      name: "Composed Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "compose",
        sourceRuleIds: [],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    expect(() => {
      composer.processComposition(rule, allRules);
    }).toThrow("sourceRuleIds required for compose composition");
  });

  it("should throw error for compose with non-existent source rules", () => {
    const rule: ConfigRule = {
      id: "composed-rule",
      name: "Composed Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "compose",
        sourceRuleIds: ["source-1", "non-existent"],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    expect(() => {
      composer.processComposition(rule, allRules);
    }).toThrow("Some source rules not found");
  });

  it("should process mixin composition", () => {
    const rule: ConfigRule = {
      id: "target-rule",
      name: "Target Rule",
      priority: 25,
      conditions: [{ type: "os", operator: "eq", value: "Android" }],
      config: {
        targetFeature: true,
      },
      composition: {
        type: "mixin",
        sourceRuleIds: ["mixin-rule"],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.processComposition(rule, allRules);

    expect(result.config.targetFeature).toBe(true);
    expect(result.config.mixinFeature).toBe(true);
    expect(result.tags).toContain("mixin");
    expect(result.tags).toContain("mixed");
  });

  it("should throw error for mixin with missing sourceRuleIds", () => {
    const rule: ConfigRule = {
      id: "target-rule",
      name: "Target Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "mixin",
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    expect(() => {
      composer.processComposition(rule, allRules);
    }).toThrow("sourceRuleIds required for mixin composition");
  });

  it("should apply multiple mixins in sequence", () => {
    const rule: ConfigRule = {
      id: "target-rule",
      name: "Target Rule",
      priority: 25,
      conditions: [],
      config: {
        targetFeature: true,
      },
      composition: {
        type: "mixin",
        sourceRuleIds: ["source-1", "source-2"],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.processComposition(rule, allRules);

    expect(result.config.targetFeature).toBe(true);
    expect(result.config.feature1).toBe(true);
    expect(result.config.feature2).toBe(true);
  });

  it("should skip non-existent mixin rules without throwing", () => {
    const rule: ConfigRule = {
      id: "target-rule",
      name: "Target Rule",
      priority: 25,
      conditions: [],
      config: {
        targetFeature: true,
      },
      composition: {
        type: "mixin",
        sourceRuleIds: ["mixin-rule", "non-existent"],
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.processComposition(rule, allRules);

    expect(result.config.targetFeature).toBe(true);
    expect(result.config.mixinFeature).toBe(true);
  });

  it("should apply composition overrides for compose type", () => {
    const rule: ConfigRule = {
      id: "composed-rule",
      name: "Composed Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "compose",
        sourceRuleIds: ["source-1", "source-2"],
        overrides: {
          name: "Overridden Name",
          priority: 100,
        },
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.processComposition(rule, allRules);

    expect(result.name).toBe("Overridden Name");
    expect(result.priority).toBe(100);
  });

  it("should handle unknown composition type", () => {
    const rule: ConfigRule = {
      id: "unknown-rule",
      name: "Unknown Rule",
      priority: 25,
      conditions: [],
      config: {},
      composition: {
        type: "unknown" as any,
      },
      resolutionStrategy: "merge",
      enabled: true,
    };

    const result = composer.processComposition(rule, allRules);

    expect(result).toEqual(rule);
  });
});
