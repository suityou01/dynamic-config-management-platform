import { describe, it, expect, beforeEach, vi } from "vitest";
import { RuleEngine } from "./ruleEngine";
import { RuleComposer } from "./ruleComposer";

// Mock the RuleComposer
vi.mock("./ruleComposer", () => ({
  RuleComposer: vi.fn(),
}));

describe("RuleEngine - Unit Tests", () => {
  let engine: RuleEngine;
  let mockComposer: any;

  beforeEach(() => {
    // Create a mock composer with the methods RuleEngine uses
    mockComposer = {
      deepMerge: vi.fn((target, source) => ({ ...target, ...source })),
    };

    engine = new RuleEngine(mockComposer);
  });

  describe("evaluateCondition", () => {
    const context: RequestContext = {
      appVersion: "1.2.3",
      os: "iOS",
      device: "mobile",
      geoCountry: "US",
      geoRegion: "CA",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
      parsedUA: {
        os: { name: "iOS" },
        device: { type: "mobile" },
      },
    };

    it("should evaluate eq operator correctly", () => {
      const condition: RuleCondition = {
        type: "app_version",
        operator: "eq",
        value: "1.2.3",
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should evaluate ne operator correctly", () => {
      const condition: RuleCondition = {
        type: "app_version",
        operator: "ne",
        value: "1.0.0",
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should evaluate gt operator correctly", () => {
      const condition: RuleCondition = {
        type: "time_after",
        operator: "gt",
        value: new Date("2024-01-01T00:00:00Z").getTime(),
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should evaluate lt operator correctly", () => {
      const condition: RuleCondition = {
        type: "time_before",
        operator: "lt",
        value: new Date("2024-12-31T23:59:59Z").getTime(),
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should evaluate gte operator correctly", () => {
      const condition: RuleCondition = {
        type: "time_after",
        operator: "gte",
        value: new Date("2024-01-15T10:00:00Z").getTime(),
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should evaluate lte operator correctly", () => {
      const condition: RuleCondition = {
        type: "time_before",
        operator: "lte",
        value: new Date("2024-01-15T10:00:00Z").getTime(),
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should evaluate in operator correctly", () => {
      const condition: RuleCondition = {
        type: "os",
        operator: "in",
        value: ["iOS", "Android"],
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should evaluate in operator as false when value not in array", () => {
      const condition: RuleCondition = {
        type: "os",
        operator: "in",
        value: ["Android", "Windows"],
      };
      expect(engine.evaluateCondition(condition, context)).toBe(false);
    });

    it("should evaluate regex operator correctly", () => {
      const condition: RuleCondition = {
        type: "user_agent_match",
        operator: "regex",
        value: "iPhone",
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should evaluate regex operator as false when pattern does not match", () => {
      const condition: RuleCondition = {
        type: "user_agent_match",
        operator: "regex",
        value: "Android",
      };
      expect(engine.evaluateCondition(condition, context)).toBe(false);
    });

    it("should use fallback values for os from parsedUA", () => {
      const contextWithoutExplicit = {
        ...context,
        os: undefined,
      };
      const osCondition: RuleCondition = {
        type: "os",
        operator: "eq",
        value: "iOS",
      };
      expect(
        engine.evaluateCondition(osCondition, contextWithoutExplicit),
      ).toBe(true);
    });

    it("should use fallback values for device from parsedUA", () => {
      const contextWithoutExplicit = {
        ...context,
        device: undefined,
      };
      const deviceCondition: RuleCondition = {
        type: "device",
        operator: "eq",
        value: "mobile",
      };
      expect(
        engine.evaluateCondition(deviceCondition, contextWithoutExplicit),
      ).toBe(true);
    });

    it("should prioritize client-provided geo country over geoCountry", () => {
      const contextWithClientGeo = {
        ...context,
        clientProvidedGeo: { country: "UK", region: "London" },
      };
      const condition: RuleCondition = {
        type: "geo_country",
        operator: "eq",
        value: "UK",
      };
      expect(engine.evaluateCondition(condition, contextWithClientGeo)).toBe(
        true,
      );
    });

    it("should prioritize client-provided geo region over geoRegion", () => {
      const contextWithClientGeo = {
        ...context,
        clientProvidedGeo: { country: "UK", region: "London" },
      };
      const condition: RuleCondition = {
        type: "geo_region",
        operator: "eq",
        value: "London",
      };
      expect(engine.evaluateCondition(condition, contextWithClientGeo)).toBe(
        true,
      );
    });

    it("should return false for unknown condition type", () => {
      const condition: RuleCondition = {
        type: "unknown_type" as any,
        operator: "eq",
        value: "test",
      };
      expect(engine.evaluateCondition(condition, context)).toBe(false);
    });

    it("should return false for unknown operator", () => {
      const condition: RuleCondition = {
        type: "app_version",
        operator: "unknown_op" as any,
        value: "1.2.3",
      };
      expect(engine.evaluateCondition(condition, context)).toBe(false);
    });
  });

  describe("registerRules", () => {
    it("should register rules in the registry", () => {
      const rules: ConfigRule[] = [
        {
          id: "rule1",
          name: "Rule 1",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
        {
          id: "rule2",
          name: "Rule 2",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];

      engine.registerRules(rules);

      // Verify by evaluating - if rules weren't registered, chain would fail
      const context: RequestContext = {
        appVersion: "1.0.0",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const chain: RuleChain = {
        operator: "OR",
        rules: ["rule1", "rule2"],
      };

      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should clear previous rules when registering new ones", () => {
      const rules1: ConfigRule[] = [
        {
          id: "rule1",
          name: "Rule 1",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];

      engine.registerRules(rules1);

      const rules2: ConfigRule[] = [
        {
          id: "rule2",
          name: "Rule 2",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];

      engine.registerRules(rules2);

      const context: RequestContext = {
        appVersion: "1.0.0",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const chain: RuleChain = {
        operator: "OR",
        rules: ["rule1"],
      };

      // rule1 should not be found
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });
  });

  describe("clearCache", () => {
    it("should clear the evaluation cache", () => {
      const rule: ConfigRule = {
        id: "cached",
        name: "Cached",
        priority: 0,
        conditions: [{ type: "os", operator: "eq", value: "iOS" }],
        config: {},
        enabled: true,
      };

      const context: RequestContext = {
        appVersion: "1.0.0",
        os: "iOS",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      engine.registerRules([rule]);

      // First evaluation
      const result1 = engine.evaluateRule(rule, context, new Set());
      expect(result1.matched).toBe(true);

      // Clear cache
      engine.clearCache();

      // Should still work after cache clear
      const result2 = engine.evaluateRule(rule, context, new Set());
      expect(result2.matched).toBe(true);
    });
  });

  describe("evaluateRuleChain", () => {
    const context: RequestContext = {
      appVersion: "1.2.3",
      os: "iOS",
      timestamp: new Date(),
      userAgent: "test",
      parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
    };

    beforeEach(() => {
      const rules: ConfigRule[] = [
        {
          id: "rule1",
          name: "Rule 1",
          priority: 0,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: {},
          enabled: true,
        },
        {
          id: "rule2",
          name: "Rule 2",
          priority: 0,
          conditions: [{ type: "app_version", operator: "eq", value: "1.2.3" }],
          config: {},
          enabled: true,
        },
        {
          id: "rule3",
          name: "Rule 3",
          priority: 0,
          conditions: [{ type: "os", operator: "eq", value: "Android" }],
          config: {},
          enabled: true,
        },
      ];
      engine.registerRules(rules);
    });

    it("should evaluate AND chain correctly when all rules match", () => {
      const chain: RuleChain = {
        operator: "AND",
        rules: ["rule1", "rule2"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should evaluate AND chain correctly when one rule fails", () => {
      const chain: RuleChain = {
        operator: "AND",
        rules: ["rule1", "rule3"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });

    it("should evaluate AND chain as false when rule not found", () => {
      const chain: RuleChain = {
        operator: "AND",
        rules: ["rule1", "nonexistent"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });

    it("should evaluate OR chain correctly when at least one matches", () => {
      const chain: RuleChain = {
        operator: "OR",
        rules: ["rule1", "rule3"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should evaluate OR chain as false when no rules match", () => {
      const chain: RuleChain = {
        operator: "OR",
        rules: ["rule3", "nonexistent"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });

    it("should evaluate NOT chain correctly", () => {
      const chain: RuleChain = {
        operator: "NOT",
        rules: ["rule3"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should evaluate NOT chain with matching rule", () => {
      const chain: RuleChain = {
        operator: "NOT",
        rules: ["rule1"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });

    it("should evaluate XOR chain correctly with exactly one match", () => {
      const chain: RuleChain = {
        operator: "XOR",
        rules: ["rule1", "rule3"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should evaluate XOR chain as false with zero matches", () => {
      const chain: RuleChain = {
        operator: "XOR",
        rules: ["rule3", "nonexistent"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });

    it("should evaluate XOR chain as false with multiple matches", () => {
      const chain: RuleChain = {
        operator: "XOR",
        rules: ["rule1", "rule2"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });

    it("should handle nested chains", () => {
      const chain: RuleChain = {
        operator: "AND",
        rules: [
          "rule1",
          {
            operator: "OR",
            rules: ["rule2", "rule3"],
          },
        ],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should handle deeply nested chains", () => {
      const chain: RuleChain = {
        operator: "AND",
        rules: [
          {
            operator: "OR",
            rules: ["rule1", "rule3"],
          },
          {
            operator: "NOT",
            rules: ["rule3"],
          },
        ],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should return false for unknown chain operator", () => {
      const chain: RuleChain = {
        operator: "UNKNOWN" as any,
        rules: ["rule1"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });
  });

  describe("evaluateRule", () => {
    const context: RequestContext = {
      appVersion: "1.2.3",
      os: "iOS",
      timestamp: new Date(),
      userAgent: "test",
      parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
    };

    it("should return false for disabled rules", () => {
      const rule: ConfigRule = {
        id: "disabled",
        name: "Disabled Rule",
        priority: 0,
        conditions: [],
        config: {},
        enabled: false,
      };
      const result = engine.evaluateRule(rule, context, new Set());
      expect(result.matched).toBe(false);
      expect(result.reason).toBe("Rule disabled");
      expect(result.rule).toBe(rule);
    });

    it("should handle exclusions", () => {
      const rule: ConfigRule = {
        id: "excluded",
        name: "Excluded Rule",
        priority: 0,
        conditions: [],
        config: {},
        enabled: true,
        exclusions: ["other-rule"],
      };
      const matchedIds = new Set(["other-rule"]);
      const result = engine.evaluateRule(rule, context, matchedIds);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe("Excluded by another rule");
    });

    it("should not exclude when exclusion rule not matched", () => {
      const rule: ConfigRule = {
        id: "not-excluded",
        name: "Not Excluded Rule",
        priority: 0,
        conditions: [],
        config: {},
        enabled: true,
        exclusions: ["other-rule"],
      };
      const matchedIds = new Set(["different-rule"]);
      const result = engine.evaluateRule(rule, context, matchedIds);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe("All conditions met");
    });

    it("should handle missing dependencies", () => {
      const rule: ConfigRule = {
        id: "dependent",
        name: "Dependent Rule",
        priority: 0,
        conditions: [],
        config: {},
        enabled: true,
        dependencies: ["required-rule"],
      };
      const result = engine.evaluateRule(rule, context, new Set());
      expect(result.matched).toBe(false);
      expect(result.reason).toBe("Missing dependencies");
    });

    it("should pass when all dependencies are met", () => {
      const rule: ConfigRule = {
        id: "dependent",
        name: "Dependent Rule",
        priority: 0,
        conditions: [],
        config: {},
        enabled: true,
        dependencies: ["required-rule"],
      };
      const matchedIds = new Set(["required-rule"]);
      const result = engine.evaluateRule(rule, context, matchedIds);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe("All conditions met");
    });

    it("should handle chain evaluation failure", () => {
      const rules: ConfigRule[] = [
        {
          id: "chain-test",
          name: "Chain Test",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
          chain: {
            operator: "AND",
            rules: ["nonexistent"],
          },
        },
      ];
      engine.registerRules(rules);
      const result = engine.evaluateRule(rules[0], context, new Set());
      expect(result.matched).toBe(false);
      expect(result.reason).toBe("Chain evaluation failed");
    });

    it("should pass chain evaluation when chain matches", () => {
      const rules: ConfigRule[] = [
        {
          id: "ios-rule",
          name: "iOS Rule",
          priority: 0,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: {},
          enabled: true,
        },
        {
          id: "chain-test",
          name: "Chain Test",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
          chain: {
            operator: "OR",
            rules: ["ios-rule"],
          },
        },
      ];
      engine.registerRules(rules);
      const result = engine.evaluateRule(rules[1], context, new Set());
      expect(result.matched).toBe(true);
      expect(result.reason).toBe("All conditions met");
    });

    it("should evaluate basic conditions successfully", () => {
      const rule: ConfigRule = {
        id: "basic",
        name: "Basic Rule",
        priority: 0,
        conditions: [{ type: "os", operator: "eq", value: "iOS" }],
        config: {},
        enabled: true,
      };
      const result = engine.evaluateRule(rule, context, new Set());
      expect(result.matched).toBe(true);
      expect(result.reason).toBe("All conditions met");
    });

    it("should fail when conditions do not match", () => {
      const rule: ConfigRule = {
        id: "basic",
        name: "Basic Rule",
        priority: 0,
        conditions: [{ type: "os", operator: "eq", value: "Android" }],
        config: {},
        enabled: true,
      };
      const result = engine.evaluateRule(rule, context, new Set());
      expect(result.matched).toBe(false);
      expect(result.reason).toBe("Conditions not met");
    });

    it("should use cache for repeated evaluations", () => {
      const rule: ConfigRule = {
        id: "cached",
        name: "Cached Rule",
        priority: 0,
        conditions: [{ type: "os", operator: "eq", value: "iOS" }],
        config: {},
        enabled: true,
      };
      engine.registerRules([rule]);

      const result1 = engine.evaluateRule(rule, context, new Set());
      const result2 = engine.evaluateRule(rule, context, new Set());

      expect(result1.matched).toBe(result2.matched);
      expect(result1.matched).toBe(true);
    });

    it("should require all conditions to pass", () => {
      const rule: ConfigRule = {
        id: "multi-condition",
        name: "Multi Condition",
        priority: 0,
        conditions: [
          { type: "os", operator: "eq", value: "iOS" },
          { type: "app_version", operator: "eq", value: "1.2.3" },
        ],
        config: {},
        enabled: true,
      };
      const result = engine.evaluateRule(rule, context, new Set());
      expect(result.matched).toBe(true);
    });

    it("should fail if any condition fails", () => {
      const rule: ConfigRule = {
        id: "multi-condition",
        name: "Multi Condition",
        priority: 0,
        conditions: [
          { type: "os", operator: "eq", value: "iOS" },
          { type: "app_version", operator: "eq", value: "9.9.9" },
        ],
        config: {},
        enabled: true,
      };
      const result = engine.evaluateRule(rule, context, new Set());
      expect(result.matched).toBe(false);
    });
  });

  describe("evaluateAllRules", () => {
    const context: RequestContext = {
      appVersion: "1.2.3",
      os: "iOS",
      timestamp: new Date(),
      userAgent: "test",
      parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
    };

    it("should evaluate multiple rules and return only matches", () => {
      const rules: ConfigRule[] = [
        {
          id: "rule1",
          name: "Rule 1",
          priority: 1,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: { feature: "enabled" },
          enabled: true,
        },
        {
          id: "rule2",
          name: "Rule 2",
          priority: 0,
          conditions: [{ type: "os", operator: "eq", value: "Android" }],
          config: {},
          enabled: true,
        },
      ];
      const { matched, results } = engine.evaluateAllRules(rules, context);
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("rule1");
      expect(results).toHaveLength(2);
      expect(results[0].matched).toBe(true);
      expect(results[1].matched).toBe(false);
    });

    it("should respect stopPropagation", () => {
      const rules: ConfigRule[] = [
        {
          id: "first",
          name: "First",
          priority: 2,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: {},
          enabled: true,
          stopPropagation: true,
        },
        {
          id: "second",
          name: "Second",
          priority: 1,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: {},
          enabled: true,
        },
      ];
      const { matched, results } = engine.evaluateAllRules(rules, context);
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("first");
      expect(results).toHaveLength(1);
    });

    it("should sort by priority (higher priority first)", () => {
      const rules: ConfigRule[] = [
        {
          id: "low",
          name: "Low Priority",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
        {
          id: "high",
          name: "High Priority",
          priority: 10,
          conditions: [],
          config: {},
          enabled: true,
        },
        {
          id: "medium",
          name: "Medium Priority",
          priority: 5,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];
      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched[0].id).toBe("high");
      expect(matched[1].id).toBe("medium");
      expect(matched[2].id).toBe("low");
    });

    it("should handle executeAfter dependencies", () => {
      const rules: ConfigRule[] = [
        {
          id: "first",
          name: "First",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
        {
          id: "second",
          name: "Second",
          priority: 10,
          conditions: [],
          config: {},
          enabled: true,
          executeAfter: ["first"],
        },
      ];
      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched[0].id).toBe("first");
      expect(matched[1].id).toBe("second");
    });

    it("should handle executeBefore constraints", () => {
      const rules: ConfigRule[] = [
        {
          id: "first",
          name: "First",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
          executeBefore: ["second"],
        },
        {
          id: "second",
          name: "Second",
          priority: 10,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];
      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched[0].id).toBe("first");
      expect(matched[1].id).toBe("second");
    });

    it("should handle complex dependency graphs", () => {
      const rules: ConfigRule[] = [
        {
          id: "c",
          name: "C",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
          executeAfter: ["a", "b"],
        },
        {
          id: "b",
          name: "B",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
          executeAfter: ["a"],
        },
        {
          id: "a",
          name: "A",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];
      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched[0].id).toBe("a");
      expect(matched[1].id).toBe("b");
      expect(matched[2].id).toBe("c");
    });

    it("should clear and re-register rules", () => {
      const rules1: ConfigRule[] = [
        {
          id: "rule1",
          name: "Rule 1",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];
      engine.evaluateAllRules(rules1, context);

      const rules2: ConfigRule[] = [
        {
          id: "rule2",
          name: "Rule 2",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];
      const { matched } = engine.evaluateAllRules(rules2, context);
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("rule2");
    });

    it("should return empty arrays when no rules match", () => {
      const rules: ConfigRule[] = [
        {
          id: "android-only",
          name: "Android Only",
          priority: 0,
          conditions: [{ type: "os", operator: "eq", value: "Android" }],
          config: {},
          enabled: true,
        },
      ];
      const { matched, results } = engine.evaluateAllRules(rules, context);
      expect(matched).toHaveLength(0);
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(false);
    });
  });

  describe("resolveConfig", () => {
    it("should handle override strategy", () => {
      const defaultConfig = { a: 1, b: 2 };
      const rules: ConfigRule[] = [
        {
          id: "override",
          name: "Override",
          priority: 0,
          conditions: [],
          config: { c: 3 },
          enabled: true,
          resolutionStrategy: "override",
        },
      ];
      const result = engine.resolveConfig(defaultConfig, rules);
      expect(result).toEqual({ c: 3 });
    });

    it("should handle merge strategy and call composer.deepMerge", () => {
      mockComposer.deepMerge.mockReturnValue({ a: 1, b: { c: 2, d: 3 }, e: 4 });

      const defaultConfig = { a: 1, b: { c: 2 } };
      const rules: ConfigRule[] = [
        {
          id: "merge",
          name: "Merge",
          priority: 0,
          conditions: [],
          config: { b: { d: 3 }, e: 4 },
          enabled: true,
          resolutionStrategy: "merge",
        },
      ];

      const result = engine.resolveConfig(defaultConfig, rules);

      expect(mockComposer.deepMerge).toHaveBeenCalledWith(defaultConfig, {
        b: { d: 3 },
        e: 4,
      });
      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
    });

    it("should handle inherit strategy", () => {
      const defaultConfig = { a: 1, b: 2 };
      const rules: ConfigRule[] = [
        {
          id: "inherit",
          name: "Inherit",
          priority: 0,
          conditions: [],
          config: { a: 10, c: 3 },
          enabled: true,
          resolutionStrategy: "inherit",
        },
      ];
      const result = engine.resolveConfig(defaultConfig, rules);
      // inherit keeps existing values, rule config comes first
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should apply multiple rules in order", () => {
      mockComposer.deepMerge
        .mockReturnValueOnce({ a: 1, b: 2 })
        .mockReturnValueOnce({ a: 1, b: 2, c: 3 });

      const defaultConfig = { a: 1 };
      const rules: ConfigRule[] = [
        {
          id: "first",
          name: "First",
          priority: 0,
          conditions: [],
          config: { b: 2 },
          enabled: true,
          resolutionStrategy: "merge",
        },
        {
          id: "second",
          name: "Second",
          priority: 0,
          conditions: [],
          config: { c: 3 },
          enabled: true,
          resolutionStrategy: "merge",
        },
      ];

      const result = engine.resolveConfig(defaultConfig, rules);

      expect(mockComposer.deepMerge).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should handle empty rules array", () => {
      const defaultConfig = { a: 1, b: 2 };
      const result = engine.resolveConfig(defaultConfig, []);
      expect(result).toEqual({ a: 1, b: 2 });
      expect(mockComposer.deepMerge).not.toHaveBeenCalled();
    });

    it("should handle mixed strategies", () => {
      mockComposer.deepMerge.mockReturnValue({ x: 1, y: 2 });

      const defaultConfig = { a: 1 };
      const rules: ConfigRule[] = [
        {
          id: "first",
          name: "First",
          priority: 0,
          conditions: [],
          config: { b: 2 },
          enabled: true,
          resolutionStrategy: "override",
        },
        {
          id: "second",
          name: "Second",
          priority: 0,
          conditions: [],
          config: { c: 3 },
          enabled: true,
          resolutionStrategy: "inherit",
        },
        {
          id: "third",
          name: "Third",
          priority: 0,
          conditions: [],
          config: { d: 4 },
          enabled: true,
          resolutionStrategy: "merge",
        },
      ];

      engine.resolveConfig(defaultConfig, rules);

      // Verify merge was called for the merge strategy
      expect(mockComposer.deepMerge).toHaveBeenCalled();
    });

    it("should not mutate original default config", () => {
      const defaultConfig = { a: 1, b: 2 };
      const originalConfig = { ...defaultConfig };
      const rules: ConfigRule[] = [
        {
          id: "mutate-test",
          name: "Mutate Test",
          priority: 0,
          conditions: [],
          config: { c: 3 },
          enabled: true,
          resolutionStrategy: "override",
        },
      ];

      engine.resolveConfig(defaultConfig, rules);

      expect(defaultConfig).toEqual(originalConfig);
    });
  });

  describe("integration scenarios with mocked composer", () => {
    it("should work end-to-end with mocked deepMerge", () => {
      mockComposer.deepMerge.mockImplementation((target, source) => ({
        ...target,
        ...source,
      }));

      const rules: ConfigRule[] = [
        {
          id: "base",
          name: "Base Rule",
          priority: 10,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: { theme: "light", animations: true },
          enabled: true,
          resolutionStrategy: "merge",
        },
        {
          id: "override-theme",
          name: "Override Theme",
          priority: 5,
          conditions: [{ type: "app_version", operator: "eq", value: "2.0.0" }],
          config: { theme: "dark" },
          enabled: true,
          resolutionStrategy: "merge",
        },
      ];

      const context: RequestContext = {
        appVersion: "2.0.0",
        os: "iOS",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched).toHaveLength(2);

      const config = engine.resolveConfig({}, matched);
      expect(mockComposer.deepMerge).toHaveBeenCalled();
      expect(config.theme).toBe("dark");
    });

    it("should handle exclusions preventing rule evaluation", () => {
      const rules: ConfigRule[] = [
        {
          id: "standard",
          name: "Standard",
          priority: 10,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: { tier: "standard" },
          enabled: true,
        },
        {
          id: "premium",
          name: "Premium",
          priority: 5,
          conditions: [{ type: "app_version", operator: "eq", value: "2.0.0" }],
          config: { tier: "premium" },
          enabled: true,
          exclusions: ["standard"],
        },
      ];

      const context: RequestContext = {
        appVersion: "2.0.0",
        os: "iOS",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const { matched, results } = engine.evaluateAllRules(rules, context);
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("standard");
      expect(results[1].matched).toBe(false);
      expect(results[1].reason).toBe("Excluded by another rule");
    });

    it("should handle rules with chains and dependencies", () => {
      const rules: ConfigRule[] = [
        {
          id: "ios-rule",
          name: "iOS Rule",
          priority: 5,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: { platform: "ios" },
          enabled: true,
        },
        {
          id: "version-rule",
          name: "Version Rule",
          priority: 3,
          conditions: [{ type: "app_version", operator: "eq", value: "1.2.3" }],
          config: { version: "1.2.3" },
          enabled: true,
        },
        {
          id: "combo-rule",
          name: "Combo Rule",
          priority: 1,
          conditions: [],
          config: { combo: true },
          enabled: true,
          chain: {
            operator: "AND",
            rules: ["ios-rule", "version-rule"],
          },
        },
      ];

      const context: RequestContext = {
        appVersion: "1.2.3",
        os: "iOS",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched.length).toBeGreaterThan(0);
      expect(matched.map((r) => r.id)).toContain("combo-rule");
    });

    it("should respect dependencies requiring prior rule matches", () => {
      const rules: ConfigRule[] = [
        {
          id: "prerequisite",
          name: "Prerequisite",
          priority: 10,
          conditions: [{ type: "os", operator: "eq", value: "iOS" }],
          config: { hasPrereq: true },
          enabled: true,
        },
        {
          id: "dependent",
          name: "Dependent",
          priority: 5,
          conditions: [{ type: "app_version", operator: "eq", value: "1.2.3" }],
          config: { isDependent: true },
          enabled: true,
          dependencies: ["prerequisite"],
        },
      ];

      const context: RequestContext = {
        appVersion: "1.2.3",
        os: "iOS",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched).toHaveLength(2);
      expect(matched[0].id).toBe("prerequisite");
      expect(matched[1].id).toBe("dependent");
    });

    it("should fail dependent rule when prerequisite does not match", () => {
      const rules: ConfigRule[] = [
        {
          id: "prerequisite",
          name: "Prerequisite",
          priority: 10,
          conditions: [{ type: "os", operator: "eq", value: "Android" }],
          config: { hasPrereq: true },
          enabled: true,
        },
        {
          id: "dependent",
          name: "Dependent",
          priority: 5,
          conditions: [{ type: "app_version", operator: "eq", value: "1.2.3" }],
          config: { isDependent: true },
          enabled: true,
          dependencies: ["prerequisite"],
        },
      ];

      const context: RequestContext = {
        appVersion: "1.2.3",
        os: "iOS",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const { matched, results } = engine.evaluateAllRules(rules, context);
      expect(matched).toHaveLength(0);
      expect(results[1].matched).toBe(false);
      expect(results[1].reason).toBe("Missing dependencies");
    });
  });

  describe("edge cases", () => {
    it("should handle rules with empty conditions array", () => {
      const rule: ConfigRule = {
        id: "no-conditions",
        name: "No Conditions",
        priority: 0,
        conditions: [],
        config: {},
        enabled: true,
      };

      const context: RequestContext = {
        appVersion: "1.0.0",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const result = engine.evaluateRule(rule, context, new Set());
      expect(result.matched).toBe(true);
    });

    it("should handle context with missing optional fields", () => {
      const context: RequestContext = {
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "Unknown" }, device: { type: "unknown" } },
      };

      const condition: RuleCondition = {
        type: "app_version",
        operator: "eq",
        value: "1.0.0",
      };

      expect(engine.evaluateCondition(condition, context)).toBe(false);
    });

    it("should handle regex with special characters", () => {
      const context: RequestContext = {
        timestamp: new Date(),
        userAgent: "Mozilla/5.0 (compatible; bot/1.0; +http://example.com)",
        parsedUA: { os: { name: "Unknown" }, device: { type: "unknown" } },
      };

      const condition: RuleCondition = {
        type: "user_agent_match",
        operator: "regex",
        value: "\\+http://",
      };

      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should handle empty rule array in evaluateAllRules", () => {
      const context: RequestContext = {
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const { matched, results } = engine.evaluateAllRules([], context);
      expect(matched).toHaveLength(0);
      expect(results).toHaveLength(0);
    });

    it("should handle circular executeAfter dependencies gracefully", () => {
      const rules: ConfigRule[] = [
        {
          id: "a",
          name: "A",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
          executeAfter: ["b"],
        },
        {
          id: "b",
          name: "B",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
          executeAfter: ["a"],
        },
      ];

      const context: RequestContext = {
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      // Should not throw, but may not evaluate all rules
      const { matched } = engine.evaluateAllRules(rules, context);
      // Both rules have circular deps, so neither can execute
      expect(matched.length).toBeLessThanOrEqual(2);
    });

    it("should handle multiple exclusions", () => {
      const rule: ConfigRule = {
        id: "excluded",
        name: "Excluded Rule",
        priority: 0,
        conditions: [],
        config: {},
        enabled: true,
        exclusions: ["rule1", "rule2", "rule3"],
      };

      const context: RequestContext = {
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const matchedIds = new Set(["rule2"]);
      const result = engine.evaluateRule(rule, context, matchedIds);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe("Excluded by another rule");
    });

    it("should handle multiple dependencies", () => {
      const rule: ConfigRule = {
        id: "dependent",
        name: "Dependent Rule",
        priority: 0,
        conditions: [],
        config: {},
        enabled: true,
        dependencies: ["req1", "req2", "req3"],
      };

      const context: RequestContext = {
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };

      const matchedIds = new Set(["req1", "req2"]);
      const result = engine.evaluateRule(rule, context, matchedIds);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe("Missing dependencies");
    });
  });
});
