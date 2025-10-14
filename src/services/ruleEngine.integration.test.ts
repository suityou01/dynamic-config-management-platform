import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "./ruleEngine";
import { RuleComposer } from "./ruleComposition";

describe("RuleEngine", () => {
  let engine: RuleEngine;
  let composer: RuleComposer;

  beforeEach(() => {
    composer = new RuleComposer();
    engine = new RuleEngine(composer);
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

    it("should evaluate regex operator correctly", () => {
      const condition: RuleCondition = {
        type: "user_agent_match",
        operator: "regex",
        value: "iPhone",
      };
      expect(engine.evaluateCondition(condition, context)).toBe(true);
    });

    it("should use fallback values for os and device", () => {
      const contextWithoutExplicit = {
        ...context,
        os: undefined,
        device: undefined,
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

    it("should use client-provided geo when available", () => {
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
        rules: ["rule1", "nonexistent"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(false);
    });

    it("should evaluate OR chain correctly", () => {
      const chain: RuleChain = {
        operator: "OR",
        rules: ["rule1", "nonexistent"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should evaluate NOT chain correctly", () => {
      const chain: RuleChain = {
        operator: "NOT",
        rules: ["nonexistent"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should evaluate XOR chain correctly with one match", () => {
      const chain: RuleChain = {
        operator: "XOR",
        rules: ["rule1", "nonexistent"],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
    });

    it("should evaluate XOR chain correctly with multiple matches", () => {
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
            rules: ["rule2", "nonexistent"],
          },
        ],
      };
      expect(engine.evaluateRuleChain(chain, context)).toBe(true);
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

    it("should handle chain evaluation", () => {
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

    it("should evaluate basic conditions", () => {
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

    it("should evaluate multiple rules and return matches", () => {
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
      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("first");
    });

    it("should sort by priority", () => {
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
      ];
      const { matched } = engine.evaluateAllRules(rules, context);
      expect(matched[0].id).toBe("high");
      expect(matched[1].id).toBe("low");
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

    it("should handle merge strategy", () => {
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
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should apply multiple rules in order", () => {
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
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe("cache management", () => {
    it("should clear cache when requested", () => {
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
      engine.evaluateRule(rule, context, new Set());
      engine.clearCache();

      // After clearing, should still evaluate correctly
      const result = engine.evaluateRule(rule, context, new Set());
      expect(result.matched).toBe(true);
    });

    it("should clear cache when registering new rules", () => {
      const rules: ConfigRule[] = [
        {
          id: "rule1",
          name: "Rule 1",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];
      engine.registerRules(rules);

      const newRules: ConfigRule[] = [
        {
          id: "rule2",
          name: "Rule 2",
          priority: 0,
          conditions: [],
          config: {},
          enabled: true,
        },
      ];
      engine.registerRules(newRules);

      // Cache should be cleared and only new rules registered
      const context: RequestContext = {
        appVersion: "1.0.0",
        timestamp: new Date(),
        userAgent: "test",
        parsedUA: { os: { name: "iOS" }, device: { type: "mobile" } },
      };
      const { matched } = engine.evaluateAllRules(newRules, context);
      expect(matched[0].id).toBe("rule2");
    });
  });
});
