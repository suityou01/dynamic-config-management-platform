import { RuleComposer } from "./ruleComposer.ts";

export class RuleEngine {
  private evaluationCache: Map<string, boolean> = new Map();
  private ruleRegistry: Map<string, ConfigRule> = new Map();
  private composer: RuleComposer;

  constructor(composer: RuleComposer) {
    this.composer = composer;
  }

  registerRules(rules: ConfigRule[]): void {
    this.ruleRegistry.clear();
    rules.forEach((rule) => this.ruleRegistry.set(rule.id, rule));
  }

  clearCache(): void {
    this.evaluationCache.clear();
  }

  evaluateCondition(
    condition: RuleCondition,
    context: RequestContext,
  ): boolean {
    const { type, operator, value } = condition;
    let contextValue: any;

    // Extract context value based on condition type
    switch (type) {
      case "app_version":
        contextValue = context.appVersion;
        break;
      case "os":
        contextValue = context.os || context.parsedUA.os.name;
        break;
      case "device":
        contextValue = context.device || context.parsedUA.device.type;
        break;
      case "geo_country":
        contextValue = context.clientProvidedGeo?.country || context.geoCountry;
        break;
      case "geo_region":
        contextValue = context.clientProvidedGeo?.region || context.geoRegion;
        break;
      case "time_after":
        contextValue = context.timestamp.getTime();
        break;
      case "time_before":
        contextValue = context.timestamp.getTime();
        break;
      case "user_agent_match":
        contextValue = context.userAgent;
        break;
      default:
        return false;
    }

    // Evaluate operator
    switch (operator) {
      case "eq":
        return contextValue === value;
      case "ne":
        return contextValue !== value;
      case "gt":
        return contextValue > value;
      case "lt":
        return contextValue < value;
      case "gte":
        return contextValue >= value;
      case "lte":
        return contextValue <= value;
      case "in":
        return Array.isArray(value) && value.includes(contextValue);
      case "regex":
        return new RegExp(value).test(String(contextValue));
      default:
        return false;
    }
  }

  evaluateRuleChain(chain: RuleChain, context: RequestContext): boolean {
    const { operator, rules } = chain;

    const results = rules.map((item) => {
      if (typeof item === "string") {
        // It's a rule ID
        const rule = this.ruleRegistry.get(item);
        if (!rule) return false;
        return this.evaluateRuleBasic(rule, context);
      } else {
        // It's a nested chain
        return this.evaluateRuleChain(item, context);
      }
    });

    switch (operator) {
      case "AND":
        return results.every((r) => r);
      case "OR":
        return results.some((r) => r);
      case "NOT":
        return !results[0]; // NOT operator only uses first rule
      case "XOR":
        return results.filter((r) => r).length === 1; // Exactly one must be true
      default:
        return false;
    }
  }

  private evaluateRuleBasic(
    rule: ConfigRule,
    context: RequestContext,
  ): boolean {
    if (!rule.enabled) return false;

    // Check cache
    const cacheKey = `${rule.id}:${JSON.stringify(context)}`;
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!;
    }

    const result = rule.conditions.every((condition) =>
      this.evaluateCondition(condition, context),
    );

    this.evaluationCache.set(cacheKey, result);
    return result;
  }

  evaluateRule(
    rule: ConfigRule,
    context: RequestContext,
    matchedRuleIds: Set<string>,
  ): RuleEvaluationResult {
    if (!rule.enabled) {
      return { matched: false, rule, reason: "Rule disabled" };
    }

    // Check exclusions (rules that prevent this rule from matching)
    if (
      rule.exclusions &&
      rule.exclusions.some((id) => matchedRuleIds.has(id))
    ) {
      return { matched: false, rule, reason: "Excluded by another rule" };
    }

    // Check dependencies (rules that must match first)
    if (
      rule.dependencies &&
      !rule.dependencies.every((id) => matchedRuleIds.has(id))
    ) {
      return { matched: false, rule, reason: "Missing dependencies" };
    }

    // Evaluate advanced chaining if present
    if (rule.chain) {
      const chainResult = this.evaluateRuleChain(rule.chain, context);
      if (!chainResult) {
        return { matched: false, rule, reason: "Chain evaluation failed" };
      }
    }

    // Evaluate basic conditions
    const basicMatch = this.evaluateRuleBasic(rule, context);

    return {
      matched: basicMatch,
      rule,
      reason: basicMatch ? "All conditions met" : "Conditions not met",
    };
  }

  evaluateAllRules(
    rules: ConfigRule[],
    context: RequestContext,
  ): { matched: ConfigRule[]; results: RuleEvaluationResult[] } {
    this.registerRules(rules);
    this.clearCache();

    const matchedRuleIds = new Set<string>();
    const results: RuleEvaluationResult[] = [];
    const matchedRules: ConfigRule[] = [];

    // Sort rules by priority and execution order
    const sortedRules = this.sortRulesByExecutionOrder(rules);

    for (const rule of sortedRules) {
      const result = this.evaluateRule(rule, context, matchedRuleIds);
      results.push(result);

      if (result.matched) {
        matchedRuleIds.add(rule.id);
        matchedRules.push(rule);

        // Stop propagation if specified
        if (rule.stopPropagation) {
          break;
        }
      }
    }

    return { matched: matchedRules, results };
  }

  private sortRulesByExecutionOrder(rules: ConfigRule[]): ConfigRule[] {
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    // Build dependency graph
    rules.forEach((rule) => {
      if (!graph.has(rule.id)) {
        graph.set(rule.id, new Set());
      }
      if (!inDegree.has(rule.id)) {
        inDegree.set(rule.id, 0);
      }

      // executeAfter means this rule depends on others
      rule.executeAfter?.forEach((depId) => {
        if (!graph.has(depId)) {
          graph.set(depId, new Set());
        }
        graph.get(depId)!.add(rule.id);
        inDegree.set(rule.id, (inDegree.get(rule.id) || 0) + 1);
      });

      // executeBefore means others depend on this rule
      rule.executeBefore?.forEach((depId) => {
        if (!graph.has(rule.id)) {
          graph.set(rule.id, new Set());
        }
        graph.get(rule.id)!.add(depId);
        inDegree.set(depId, (inDegree.get(depId) || 0) + 1);
      });
    });

    // Topological sort with priority consideration
    const sorted: ConfigRule[] = [];
    const queue: ConfigRule[] = [];

    // Start with rules that have no dependencies
    rules.forEach((rule) => {
      if ((inDegree.get(rule.id) || 0) === 0) {
        queue.push(rule);
      }
    });

    // Sort queue by priority
    queue.sort((a, b) => b.priority - a.priority);

    while (queue.length > 0) {
      const rule = queue.shift()!;
      sorted.push(rule);

      const dependents = graph.get(rule.id) || new Set();
      dependents.forEach((depId) => {
        const newDegree = (inDegree.get(depId) || 0) - 1;
        inDegree.set(depId, newDegree);

        if (newDegree === 0) {
          const depRule = rules.find((r) => r.id === depId);
          if (depRule) {
            queue.push(depRule);
            queue.sort((a, b) => b.priority - a.priority);
          }
        }
      });
    }

    // Add any remaining rules (shouldn't happen with valid graph)
    rules.forEach((rule) => {
      if (!sorted.includes(rule)) {
        sorted.push(rule);
      }
    });

    return sorted;
  }

  resolveConfig(
    defaultConfig: Record<string, any>,
    matchedRules: ConfigRule[],
  ): Record<string, any> {
    let result = { ...defaultConfig };

    for (const rule of matchedRules) {
      switch (rule.resolutionStrategy) {
        case "override":
          // Replace entire config
          result = { ...rule.config };
          break;
        case "merge":
          // Deep merge using composer's method
          result = this.composer.deepMerge(result, rule.config);
          break;
        case "inherit":
          // Shallow merge, keeping existing values
          result = { ...rule.config, ...result };
          break;
      }
    }

    return result;
  }
}
