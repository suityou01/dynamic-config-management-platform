import {
  LoadCondition,
  ConditionalRule,
  RequestContext,
  ConfigSpecification,
  ConfigRule,
} from "../types";
import * as crypto from "crypto";

export class ConditionalRuleLoader {
  private loadedRulesCache: Map<string, Map<string, ConfigRule>> = new Map();

  private generateCacheKey(
    context: RequestContext,
    spec: ConfigSpecification,
  ): string {
    // Create a deterministic hash of the request context
    const cacheObject = {
      userId: context.userId,
      customContext: context.customContext,
      featureFlags: context.featureFlags,
      environment: context.environment,
      specId: spec.id,
      specVersion: spec.version,
    };

    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(cacheObject))
      .digest("hex");

    return hash;
  }

  evaluateLoadCondition(
    condition: LoadCondition,
    context: RequestContext,
    spec: ConfigSpecification,
  ): boolean {
    switch (condition.type) {
      case "environment":
        return spec.environment === condition.value;

      case "feature_flag": {
        const { flagName, expectedValue } = condition.value;
        const flagValue =
          context.featureFlags?.[flagName] ?? spec.featureFlags?.[flagName];
        return flagValue === expectedValue;
      }

      case "percentage_rollout": {
        const { percentage, ruleId } = condition.value;
        if (!context.userId) return false;

        // Deterministic percentage based on userId hash
        const hash = this.hashString(`${ruleId}:${context.userId}`);
        const userPercentage = (hash % 100) + 1;
        return userPercentage <= percentage;
      }

      case "custom": {
        const { key, operator, value } = condition.value;
        const contextValue = context.customContext?.[key];
        return this.evaluateCustomCondition(contextValue, operator, value);
      }

      default:
        return false;
    }
  }

  shouldLoadRule(
    conditionalRule: ConditionalRule,
    context: RequestContext,
    spec: ConfigSpecification,
  ): boolean {
    return conditionalRule.loadConditions.every((condition) =>
      this.evaluateLoadCondition(condition, context, spec),
    );
  }

  loadConditionalRules(
    spec: ConfigSpecification,
    context: RequestContext,
    allRules: ConfigRule[],
  ): ConfigRule[] {
    if (!spec.conditionalRules || spec.conditionalRules.length === 0) {
      return [];
    }

    const cacheKey = this.generateCacheKey(context, spec);

    // Check if we have cached results for this exact context
    if (this.loadedRulesCache.has(cacheKey)) {
      const cachedRules = this.loadedRulesCache.get(cacheKey)!;
      return Array.from(cachedRules.values());
    }

    const loadedRulesMap = new Map<string, ConfigRule>();

    for (const conditionalRule of spec.conditionalRules) {
      // Evaluate load conditions
      if (this.shouldLoadRule(conditionalRule, context, spec)) {
        const rule = allRules.find((r) => r.id === conditionalRule.ruleId);
        if (rule) {
          // Enable the rule when loading conditionally
          const enabledRule = { ...rule, enabled: true };
          loadedRulesMap.set(conditionalRule.ruleId, enabledRule);
        }
      }
    }

    // Cache the results for this context
    this.loadedRulesCache.set(cacheKey, loadedRulesMap);

    return Array.from(loadedRulesMap.values());
  }

  clearCache(): void {
    this.loadedRulesCache.clear();
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private evaluateCustomCondition(
    contextValue: any,
    operator: string,
    value: any,
  ): boolean {
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
}
