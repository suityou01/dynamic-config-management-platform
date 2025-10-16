#!/usr/bin/env node
import { promises as fs } from "node:fs";
import * as path from "node:path";

// Types (simplified from your codebase)
interface ConfigRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  dependencies?: string[];
  exclusions?: string[];
  executeAfter?: string[];
  executeBefore?: string[];
  stopPropagation?: boolean;
  composition?: {
    type: "extend" | "compose" | "mixin";
    baseRuleId?: string;
    sourceRuleIds?: string[];
  };
  tags?: string[];
}

interface ConditionalRule {
  ruleId: string;
  loadConditions: Array<{ type: string; value: any }>;
  lazyLoad?: boolean;
}

interface ConfigSpecification {
  id: string;
  appId: string;
  version: string;
  rules: ConfigRule[];
  conditionalRules?: ConditionalRule[];
}

class ConfigVisualizer {
  private spec: ConfigSpecification;
  private output: string[] = [];

  constructor(spec: ConfigSpecification) {
    this.spec = spec;
  }

  generate(): string {
    this.output = [];
    this.addHeader();
    this.addRules();
    this.addConditionalRules();
    this.addDependencies();
    this.addExecutionOrder();
    this.addExclusions();
    this.addCompositions();
    this.addLegend();
    this.addFooter();

    return this.output.join("\n");
  }

  private addHeader(): void {
    this.output.push("digraph ConfigSpec {");
    this.output.push('  label="Configuration Specification Visualization";');
    this.output.push('  labelloc="t";');
    this.output.push("  fontsize=20;");
    this.output.push('  fontname="Arial Bold";');
    this.output.push("  rankdir=TB;");
    this.output.push("  node [shape=box, style=filled, fontname=Arial];");
    this.output.push("  edge [fontname=Arial, fontsize=10];");
    this.output.push("");

    // Spec info
    this.output.push("  // Specification Info");
    this.output.push(
      `  spec_info [label="${this.spec.appId}\\nv${this.spec.version}", shape=note, fillcolor=lightblue];`,
    );
    this.output.push("");
  }

  private addRules(): void {
    this.output.push("  // Rules");
    const sortedRules = [...this.spec.rules].sort(
      (a, b) => b.priority - a.priority,
    );

    for (const rule of sortedRules) {
      const color = this.getRuleColor(rule);
      const shape = rule.stopPropagation ? "octagon" : "box";
      const style = rule.enabled ? "filled" : "filled,dashed";
      const tags = rule.tags ? `\\n[${rule.tags.join(", ")}]` : "";
      const priority = `\\nPriority: ${rule.priority}`;

      this.output.push(
        `  "${rule.id}" [label="${rule.name}${priority}${tags}", fillcolor="${color}", shape=${shape}, style="${style}"];`,
      );
    }
    this.output.push("");
  }

  private addConditionalRules(): void {
    if (!this.spec.conditionalRules?.length) return;

    this.output.push("  // Conditional Loading");
    this.output.push("  subgraph cluster_conditional {");
    this.output.push('    label="Conditional Rules";');
    this.output.push("    style=dashed;");
    this.output.push("    color=purple;");
    this.output.push("");

    for (const condRule of this.spec.conditionalRules) {
      const conditionTypes = condRule.loadConditions
        .map((c) => c.type)
        .join(", ");
      const lazyLabel = condRule.lazyLoad ? "\\n(Lazy Load)" : "";

      this.output.push(
        `    "cond_${condRule.ruleId}" [label="Condition\\n${conditionTypes}${lazyLabel}", shape=diamond, fillcolor=plum];`,
      );
      this.output.push(
        `    "cond_${condRule.ruleId}" -> "${condRule.ruleId}" [label="loads", color=purple, style=dashed];`,
      );
    }

    this.output.push("  }");
    this.output.push("");
  }

  private addDependencies(): void {
    this.output.push("  // Dependencies");
    for (const rule of this.spec.rules) {
      if (rule.dependencies && rule.dependencies.length > 0) {
        for (const depId of rule.dependencies) {
          this.output.push(
            `  "${depId}" -> "${rule.id}" [label="requires", color=blue, style=bold];`,
          );
        }
      }
    }
    this.output.push("");
  }

  private addExecutionOrder(): void {
    this.output.push("  // Execution Order");
    for (const rule of this.spec.rules) {
      if (rule.executeAfter && rule.executeAfter.length > 0) {
        for (const afterId of rule.executeAfter) {
          this.output.push(
            `  "${afterId}" -> "${rule.id}" [label="then", color=green];`,
          );
        }
      }
      if (rule.executeBefore && rule.executeBefore.length > 0) {
        for (const beforeId of rule.executeBefore) {
          this.output.push(
            `  "${rule.id}" -> "${beforeId}" [label="before", color=green];`,
          );
        }
      }
    }
    this.output.push("");
  }

  private addExclusions(): void {
    this.output.push("  // Exclusions");
    for (const rule of this.spec.rules) {
      if (rule.exclusions && rule.exclusions.length > 0) {
        for (const exclId of rule.exclusions) {
          this.output.push(
            `  "${exclId}" -> "${rule.id}" [label="excludes", color=red, style=dashed, arrowhead=tee];`,
          );
        }
      }
    }
    this.output.push("");
  }

  private addCompositions(): void {
    this.output.push("  // Rule Compositions");
    for (const rule of this.spec.rules) {
      if (rule.composition) {
        const { type, baseRuleId, sourceRuleIds } = rule.composition;

        if (type === "extend" && baseRuleId) {
          this.output.push(
            `  "${baseRuleId}" -> "${rule.id}" [label="extends", color=orange, style=dotted];`,
          );
        }

        if ((type === "compose" || type === "mixin") && sourceRuleIds) {
          for (const sourceId of sourceRuleIds) {
            const label = type === "compose" ? "composes" : "mixes";
            this.output.push(
              `  "${sourceId}" -> "${rule.id}" [label="${label}", color=orange, style=dotted];`,
            );
          }
        }
      }
    }
    this.output.push("");
  }

  private addLegend(): void {
    this.output.push("  // Legend");
    this.output.push("  subgraph cluster_legend {");
    this.output.push('    label="Legend";');
    this.output.push("    style=filled;");
    this.output.push("    color=lightgrey;");
    this.output.push("");
    this.output.push(
      '    legend_env [label="Environment Rules", fillcolor=lightyellow];',
    );
    this.output.push(
      '    legend_platform [label="Platform Rules", fillcolor=lightgreen];',
    );
    this.output.push(
      '    legend_geo [label="Geographic Rules", fillcolor=lightblue];',
    );
    this.output.push(
      '    legend_perf [label="Performance Rules", fillcolor=lightcoral];',
    );
    this.output.push(
      '    legend_security [label="Security Rules", fillcolor=pink];',
    );
    this.output.push(
      '    legend_vip [label="VIP/Special Rules", fillcolor=gold];',
    );
    this.output.push(
      '    legend_disabled [label="Disabled Rule", fillcolor=lightgrey, style=dashed];',
    );
    this.output.push(
      '    legend_stop [label="Stop Propagation", shape=octagon, fillcolor=white];',
    );
    this.output.push("  }");
    this.output.push("");
  }

  private addFooter(): void {
    this.output.push("}");
  }

  private getRuleColor(rule: ConfigRule): string {
    // Color based on tags or rule type
    const tags = rule.tags || [];

    if (
      tags.includes("environment") ||
      tags.includes("development") ||
      tags.includes("staging")
    ) {
      return "lightyellow";
    }
    if (
      tags.includes("ios") ||
      tags.includes("android") ||
      tags.includes("mobile") ||
      tags.includes("tablet")
    ) {
      return "lightgreen";
    }
    if (
      tags.includes("geo") ||
      tags.includes("uk") ||
      tags.includes("scotland") ||
      tags.includes("regional")
    ) {
      return "lightblue";
    }
    if (
      tags.includes("performance") ||
      tags.includes("connectivity") ||
      tags.includes("offline")
    ) {
      return "lightcoral";
    }
    if (tags.includes("security") || tags.includes("gov-workers")) {
      return "pink";
    }
    if (
      tags.includes("vip") ||
      tags.includes("mp") ||
      tags.includes("minister") ||
      tags.includes("cabinet")
    ) {
      return "gold";
    }
    if (tags.includes("beta") || tags.includes("testing")) {
      return "lavender";
    }

    return rule.enabled ? "white" : "lightgrey";
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      "Usage: config-visualizer <config-file.json> [output-file.dot]",
    );
    console.error("\nExample:");
    console.error("  config-visualizer govuk-app.002.json");
    console.error("  config-visualizer govuk-app.002.json output.dot");
    console.error("\nTo generate an image:");
    console.error("  dot -Tpng output.dot -o config.png");
    console.error("  dot -Tsvg output.dot -o config.svg");
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace(/\.json$/, ".dot");

  try {
    // Read config file
    const content = await fs.readFile(inputFile, "utf-8");
    const spec: ConfigSpecification = JSON.parse(content);

    console.log(`📊 Visualizing: ${spec.appId} v${spec.version}`);
    console.log(`📋 Rules: ${spec.rules.length}`);
    console.log(`🔀 Conditional Rules: ${spec.conditionalRules?.length || 0}`);

    // Generate DOT file
    const visualizer = new ConfigVisualizer(spec);
    const dotOutput = visualizer.generate();

    // Write output
    await fs.writeFile(outputFile, dotOutput);

    console.log(`\n✅ Generated: ${outputFile}`);
    console.log("\n🎨 To generate an image, run:");
    console.log(
      `   dot -Tpng ${outputFile} -o ${outputFile.replace(/\.dot$/, ".png")}`,
    );
    console.log(
      `   dot -Tsvg ${outputFile} -o ${outputFile.replace(/\.dot$/, ".svg")}`,
    );
    console.log(
      `   dot -Tpdf ${outputFile} -o ${outputFile.replace(/\.dot$/, ".pdf")}`,
    );

    // Statistics
    console.log("\n📈 Statistics:");
    const enabledRules = spec.rules.filter((r) => r.enabled).length;
    const disabledRules = spec.rules.length - enabledRules;
    const rulesWithDeps = spec.rules.filter(
      (r) => r.dependencies?.length,
    ).length;
    const rulesWithExclusions = spec.rules.filter(
      (r) => r.exclusions?.length,
    ).length;
    const rulesWithExecutionOrder = spec.rules.filter(
      (r) => r.executeAfter?.length || r.executeBefore?.length,
    ).length;
    const rulesWithComposition = spec.rules.filter((r) => r.composition).length;

    console.log(`   Enabled: ${enabledRules}, Disabled: ${disabledRules}`);
    console.log(`   With Dependencies: ${rulesWithDeps}`);
    console.log(`   With Exclusions: ${rulesWithExclusions}`);
    console.log(`   With Execution Order: ${rulesWithExecutionOrder}`);
    console.log(`   With Composition: ${rulesWithComposition}`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
