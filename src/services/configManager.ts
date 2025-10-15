import * as fs from "node:fs";
import * as path from "node:path";
import { ConfigSpecification } from "../../types";

export class ConfigurationManager {
  private configDir: string;
  private specifications: Map<string, ConfigSpecification> = new Map();

  constructor(configDir: string = "../../config-store") {
    this.configDir = configDir;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await this.loadAllSpecifications();
    } catch (error) {
      console.error("Failed to initialize configuration manager:", error);
      throw error;
    }
  }

  async loadAllSpecifications(): Promise<void> {
    try {
      const files = await fs.readdir(this.configDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = await fs.readFile(
            path.join(this.configDir, file),
            "utf-8",
          );
          const spec: ConfigSpecification = JSON.parse(content);
          this.specifications.set(`${spec.appId}:${spec.version}`, spec);
        }
      }
      console.log(
        `Loaded ${this.specifications.size} configuration specifications`,
      );
    } catch (error) {
      console.error("Failed to load specifications:", error);
    }
  }

  async saveSpecification(spec: ConfigSpecification): Promise<void> {
    const filename = `${spec.appId}-${spec.version}.json`;
    const filepath = path.join(this.configDir, filename);
    spec.updatedAt = new Date().toISOString();
    await fs.writeFile(filepath, JSON.stringify(spec, null, 2));
    this.specifications.set(`${spec.appId}:${spec.version}`, spec);
  }

  getSpecification(
    appId: string,
    version: string,
  ): ConfigSpecification | undefined {
    return this.specifications.get(`${appId}:${version}`);
  }

  getAllSpecifications(): ConfigSpecification[] {
    return Array.from(this.specifications.values());
  }

  validateConfig(
    config: Record<string, any>,
    schema: ConfigSchema,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required keys
    for (const key of schema.requiredKeys) {
      if (!(key in config)) {
        errors.push(`Missing required key: ${key}`);
      }
    }

    // Check for deprecated keys
    const configKeys = Object.keys(config);
    for (const key of configKeys) {
      if (schema.deprecatedKeys.includes(key)) {
        errors.push(`Using deprecated key: ${key}`);
      }
    }

    // Check for unknown keys
    const allAllowedKeys = [
      ...schema.requiredKeys,
      ...schema.optionalKeys,
      ...schema.deprecatedKeys,
    ];
    for (const key of configKeys) {
      if (!allAllowedKeys.includes(key)) {
        errors.push(`Unknown key: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
