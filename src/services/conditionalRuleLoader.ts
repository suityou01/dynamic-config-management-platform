export class ConditionalRuleLoader {
  private loadedRules: Map<string, ConfigRule> = new Map();

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

    const loadedRules: ConfigRule[] = [];

    for (const conditionalRule of spec.conditionalRules) {
      // Check if already loaded
      if (this.loadedRules.has(conditionalRule.ruleId)) {
        loadedRules.push(this.loadedRules.get(conditionalRule.ruleId)!);
        continue;
      }

      // Evaluate load conditions
      if (this.shouldLoadRule(conditionalRule, context, spec)) {
        const rule = allRules.find((r) => r.id === conditionalRule.ruleId);
        if (rule) {
          this.loadedRules.set(conditionalRule.ruleId, rule);
          loadedRules.push(rule);
        }
      }
    }

    return loadedRules;
  }

  clearCache(): void {
    this.loadedRules.clear();
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
      case "in":
        return Array.isArray(value) && value.includes(contextValue);
      default:
        return false;
    }
  }
}
