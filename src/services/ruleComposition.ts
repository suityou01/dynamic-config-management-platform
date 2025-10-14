import { ConfigRule, RuleRessolutionStrategy } from "../types";
import { merge } from "../utils/merge";

export class RuleComposer {
  private templates: Map<string, Partial<ConfigRule>> = new Map();
  private composedRules: Map<string, ConfigRule> = new Map();

  registerTemplates(templates: Record<string, Partial<ConfigRule>>): void {
    Object.entries(templates).forEach(([id, template]) => {
      this.templates.set(id, template);
    });
  }

  // Extend a base rule with modifications
  extendRule(baseRule: ConfigRule, overrides: Partial<ConfigRule>): ConfigRule {
    return {
      ...baseRule,
      ...overrides,
      id: overrides.id || `${baseRule.id}-extended`,
      conditions: overrides.conditions || baseRule.conditions,
      config: this.deepMerge(baseRule.config, overrides.config),
      metadata: {
        ...baseRule.metadata,
        ...overrides.metadata,
        extendedFrom: baseRule.id,
      },
    };
  }

  // Compose multiple rules into one
  composeRules(
    sourceRules: ConfigRule[],
    newRuleId: string,
    strategy: RuleResolutionStrategy = "merge",
  ): ConfigRule {
    if (sourceRules.length === 0) {
      throw new Error("Cannot compose empty rule set");
    }

    const [first, ...rest] = sourceRules;

    // Merge all conditions
    const allConditions = sourceRules.flatMap((r) => r.conditions);

    // Merge configs based on strategy
    let mergedConfig = { ...first.config };
    rest.forEach((rule) => {
      mergedConfig = this.mergeConfigs(mergedConfig, rule.config, strategy);
    });

    // Combine dependencies and exclusions
    const allDependencies = new Set<string>();
    const allExclusions = new Set<string>();
    const allTags = new Set<string>();

    sourceRules.forEach((rule) => {
      rule.dependencies?.forEach((d) => allDependencies.add(d));
      rule.exclusions?.forEach((e) => allExclusions.add(e));
      rule.tags?.forEach((t) => allTags.add(t));
    });

    return {
      id: newRuleId,
      name: `Composed: ${sourceRules.map((r) => r.name).join(" + ")}`,
      description: `Composed from: ${sourceRules.map((r) => r.id).join(", ")}`,
      priority: Math.max(...sourceRules.map((r) => r.priority)),
      conditions: allConditions,
      config: mergedConfig,
      resolutionStrategy: strategy,
      enabled: sourceRules.every((r) => r.enabled),
      dependencies: Array.from(allDependencies),
      exclusions: Array.from(allExclusions),
      tags: Array.from(allTags),
      metadata: {
        composedFrom: sourceRules.map((r) => r.id),
        compositionStrategy: strategy,
      },
    };
  }

  // Mixin pattern - apply rule as a mixin to another rule
  applyMixin(targetRule: ConfigRule, mixinRule: ConfigRule): ConfigRule {
    return {
      ...targetRule,
      config: this.mergeConfigs(targetRule.config, mixinRule.config, "merge"),
      conditions: [...targetRule.conditions, ...mixinRule.conditions],
      tags: [...(targetRule.tags || []), ...(mixinRule.tags || []), "mixed"],
      metadata: {
        ...targetRule.metadata,
        mixins: [...(targetRule.metadata?.mixins || []), mixinRule.id],
      },
    };
  }

  // Create rule from template
  createFromTemplate(
    templateId: string,
    overrides: Partial<ConfigRule>,
  ): ConfigRule {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (!overrides.id) {
      throw new Error("Rule ID must be provided when creating from template");
    }

    // Deep merge configs instead of shallow merge
    const mergedConfig = this.deepMerge(
      template.config || {},
      overrides.config || {},
    );

    const rule: ConfigRule = {
      id: overrides.id,
      name: overrides.name || template.name || "Unnamed Rule",
      description: overrides.description || template.description,
      priority: overrides.priority ?? template.priority ?? 0,
      conditions: overrides.conditions || template.conditions || [],
      config: mergedConfig,
      resolutionStrategy:
        overrides.resolutionStrategy || template.resolutionStrategy || "merge",
      enabled: overrides.enabled ?? template.enabled ?? true,
      dependencies: overrides.dependencies || template.dependencies,
      exclusions: overrides.exclusions || template.exclusions,
      chain: overrides.chain || template.chain,
      executeAfter: overrides.executeAfter || template.executeAfter,
      executeBefore: overrides.executeBefore || template.executeBefore,
      stopPropagation: overrides.stopPropagation ?? template.stopPropagation,
      composition: overrides.composition || template.composition,
      tags: overrides.tags || template.tags,
      metadata: {
        ...template.metadata,
        ...overrides.metadata,
        createdFromTemplate: templateId,
      },
    };

    return rule;
  }

  // Process rule composition
  processComposition(rule: ConfigRule, allRules: ConfigRule[]): ConfigRule {
    if (!rule.composition) {
      return rule;
    }

    const { type, baseRuleId, sourceRuleIds, overrides } = rule.composition;

    switch (type) {
      case "extend": {
        if (!baseRuleId) {
          throw new Error("baseRuleId required for extend composition");
        }
        const baseRule = allRules.find((r) => r.id === baseRuleId);
        if (!baseRule) {
          throw new Error(`Base rule not found: ${baseRuleId}`);
        }
        // Merge the original rule's properties with overrides
        const combinedOverrides = {
          ...rule,
          ...overrides,
          id: rule.id,
          config: this.deepMerge(rule.config || {}, overrides?.config || {}),
        };
        return this.extendRule(baseRule, combinedOverrides);
      }

      case "compose": {
        if (!sourceRuleIds || sourceRuleIds.length === 0) {
          throw new Error("sourceRuleIds required for compose composition");
        }
        const sourceRules = sourceRuleIds
          .map((id) => allRules.find((r) => r.id === id))
          .filter((r): r is ConfigRule => r !== undefined);

        if (sourceRules.length !== sourceRuleIds.length) {
          throw new Error("Some source rules not found");
        }

        const composed = this.composeRules(
          sourceRules,
          rule.id,
          rule.resolutionStrategy,
        );
        return { ...composed, ...overrides };
      }

      case "mixin": {
        if (!sourceRuleIds || sourceRuleIds.length === 0) {
          throw new Error("sourceRuleIds required for mixin composition");
        }
        let result = rule;
        for (const mixinId of sourceRuleIds) {
          const mixinRule = allRules.find((r) => r.id === mixinId);
          if (mixinRule) {
            result = this.applyMixin(result, mixinRule);
          }
        }
        return result;
      }

      default:
        return rule;
    }
  }

  private mergeConfigs(
    target: any,
    source: any,
    strategy: RuleResolutionStrategy,
  ): any {
    switch (strategy) {
      case "override":
        return { ...source };
      case "merge":
        return this.deepMerge(target, source);
      case "inherit":
        return { ...source, ...target };
      default:
        return target;
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (
        source[key] instanceof Object &&
        key in target &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
