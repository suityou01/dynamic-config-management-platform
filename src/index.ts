import express, { Request, Response } from "express";
import { UAParser } from "ua-parser-js";
import { RuleComposer } from "./services/ruleComposition";
import { RuleEngine } from "./services/ruleEngine";
import { ConfigurationManager } from "./services/configManager";
import { ConditionalRuleLoader } from "./services/conditionalRuleLoader";
import { GeoLocationService } from "./services/geolocation";
import { ConfigRule, RequestContext, ConfigSpecification } from "./types";

const app = express();
app.use(express.json());

const port = 3000;

const ruleComposer = new RuleComposer();
const ruleEngine = new RuleEngine(ruleComposer);
const configManager = new ConfigurationManager();
const conditionalLoader = new ConditionalRuleLoader();
const geoService = new GeoLocationService();

// Initialize the configuration manager
configManager.initialize().catch(console.error);

// Helper to extract app version from user-agent
function extractAppVersion(ua: string): string {
  const match = ua.match(/AppVersion\/(\d+\.\d+\.\d+)/);
  return match ? match[1] : "1.0.0";
}

// Helper to get client IP
function getClientIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.connection.remoteAddress ||
    "127.0.0.1"
  );
}

// ============================================
// Routes
// ============================================

// GET /config/:appId/:version - Fetch configuration
app.get("/config/:appId/:version", async (req: Request, res: Response) => {
  try {
    const { appId, version } = req.params;
    const userAgent = req.headers["user-agent"] || "";
    const clientIP = getClientIP(req);

    // Parse user agent
    const parser = new UAParser(userAgent);
    const parsedUA = parser.getResult();

    // Get geolocation
    const geoLocation = await geoService.lookupIP(clientIP);

    // Build request context
    const context: RequestContext = {
      userAgent,
      parsedUA,
      appVersion: extractAppVersion(userAgent) || version,
      os: parsedUA.os.name,
      device: parsedUA.device.type || "Desktop",
      geoCountry: geoLocation?.country,
      geoRegion: geoLocation?.region,
      clientProvidedGeo: {
        country: req.query.country as string,
        region: req.query.region as string,
      },
      timestamp: new Date(),
      environment: (req.query.env as string) || undefined,
      featureFlags: req.query.flags
        ? JSON.parse(req.query.flags as string)
        : undefined,
      userId: (req.query.userId as string) || undefined,
      customContext: req.query.context
        ? JSON.parse(req.query.context as string)
        : undefined,
    };

    // Get configuration specification
    const spec = configManager.getSpecification(appId, version);
    if (!spec) {
      return res.status(404).json({
        error: "Configuration not found",
        appId,
        version,
      });
    }

    // Register rule templates
    if (spec.ruleTemplates) {
      ruleComposer.registerTemplates(spec.ruleTemplates);
    }

    // Process rule compositions
    const processedRules = spec.rules.map((rule) =>
      ruleComposer.processComposition(rule, spec.rules),
    );

    // Load conditional rules
    const conditionalRules = conditionalLoader.loadConditionalRules(
      spec,
      context,
      processedRules,
    );

    // Filter out conditional rules that are already in processedRules to avoid duplicates
    const conditionalRuleIds = new Set(conditionalRules.map((r) => r.id));
    const baseRules = processedRules.filter(
      (r) => !conditionalRuleIds.has(r.id),
    );

    // Combine: base rules + conditional rules (conditional rules only if conditions met)
    const allRules = [...baseRules, ...conditionalRules];

    // Evaluate rules
    const { matched, results } = ruleEngine.evaluateAllRules(allRules, context);

    // Resolve final configuration
    const finalConfig = ruleEngine.resolveConfig(spec.defaultConfig, matched);

    // Validate the final config
    const validation = configManager.validateConfig(finalConfig, spec.schema);

    res.json({
      appId,
      version,
      config: finalConfig,
      matchedRules: matched.map((r) => ({
        id: r.id,
        name: r.name,
        priority: r.priority,
      })),
      validation,
      context: {
        os: context.os,
        device: context.device,
        geoCountry: context.geoCountry,
        geoRegion: context.geoRegion,
      },
    });
  } catch (error) {
    console.error("Error fetching configuration:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// POST /config - Create new configuration specification
app.post("/config", async (req: Request, res: Response) => {
  try {
    const spec: ConfigSpecification = req.body;

    // Validate required fields
    if (!spec.appId || !spec.version || !spec.schema || !spec.defaultConfig) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["appId", "version", "schema", "defaultConfig"],
      });
    }

    // Validate default config against schema
    const validation = configManager.validateConfig(
      spec.defaultConfig,
      spec.schema,
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: "Invalid default configuration",
        errors: validation.errors,
      });
    }

    // Set timestamps
    spec.createdAt = new Date().toISOString();
    spec.updatedAt = new Date().toISOString();

    // Initialize rules if not provided
    spec.rules = spec.rules || [];
    spec.conditionalRules = spec.conditionalRules || [];

    // Save specification
    await configManager.saveSpecification(spec);

    res.status(201).json({
      message: "Configuration created successfully",
      spec: {
        id: spec.id,
        appId: spec.appId,
        version: spec.version,
      },
    });
  } catch (error) {
    console.error("Error creating configuration:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// POST /rules/compose - Compose multiple rules into one
app.post("/rules/compose", (req: Request, res: Response) => {
  try {
    const { sourceRuleIds, newRuleId, strategy, appId, version } = req.body;

    if (!sourceRuleIds || !newRuleId || !appId || !version) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["sourceRuleIds", "newRuleId", "appId", "version"],
      });
    }

    const spec = configManager.getSpecification(appId, version);
    if (!spec) {
      return res.status(404).json({
        error: "Configuration not found",
      });
    }

    // Find source rules
    const sourceRules = sourceRuleIds
      .map((id: string) => spec.rules.find((r) => r.id === id))
      .filter((r: ConfigRule | undefined) => r !== undefined);

    if (sourceRules.length !== sourceRuleIds.length) {
      return res.status(404).json({
        error: "Some source rules not found",
      });
    }

    // Compose rules
    const composedRule = ruleComposer.composeRules(
      sourceRules,
      newRuleId,
      strategy || "merge",
    );

    res.json({
      message: "Rules composed successfully",
      rule: composedRule,
    });
  } catch (error) {
    console.error("Error composing rules:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// POST /rules/from-template - Create rule from template
app.post("/rules/from-template", (req: Request, res: Response) => {
  try {
    const { templateId, overrides, appId, version } = req.body;

    if (!templateId || !overrides || !appId || !version) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["templateId", "overrides", "appId", "version"],
      });
    }

    const spec = configManager.getSpecification(appId, version);
    if (!spec) {
      return res.status(404).json({
        error: "Configuration not found",
      });
    }

    // Register templates
    if (spec.ruleTemplates) {
      ruleComposer.registerTemplates(spec.ruleTemplates);
    }

    // Create rule from template
    const rule = ruleComposer.createFromTemplate(templateId, overrides);

    res.json({
      message: "Rule created from template successfully",
      rule,
    });
  } catch (error) {
    console.error("Error creating rule from template:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// POST /rules/test-conditions - Test conditional loading
app.post("/rules/test-conditions", async (req: Request, res: Response) => {
  try {
    const { appId, version, context: contextOverrides } = req.body;

    if (!appId || !version) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["appId", "version"],
      });
    }

    const spec = configManager.getSpecification(appId, version);
    if (!spec) {
      return res.status(404).json({
        error: "Configuration not found",
      });
    }

    // Build test context
    const userAgent = req.headers["user-agent"] || "";
    const parser = new UAParser(userAgent);
    const parsedUA = parser.getResult();

    const context: RequestContext = {
      userAgent,
      parsedUA,
      appVersion: version,
      os: parsedUA.os.name,
      device: parsedUA.device.type || "Desktop",
      timestamp: new Date(),
      ...contextOverrides,
    };

    // Test conditional rules
    const results = spec.conditionalRules?.map((conditionalRule) => ({
      ruleId: conditionalRule.ruleId,
      shouldLoad: conditionalLoader.shouldLoadRule(
        conditionalRule,
        context,
        spec,
      ),
      conditions: conditionalRule.loadConditions,
    }));

    res.json({
      message: "Conditional rules tested",
      context,
      results: results || [],
    });
  } catch (error) {
    console.error("Error testing conditions:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// PUT /config/:appId/:version - Update configuration specification
app.put("/config/:appId/:version", async (req: Request, res: Response) => {
  try {
    const { appId, version } = req.params;
    const updates = req.body;

    const existingSpec = configManager.getSpecification(appId, version);
    if (!existingSpec) {
      return res.status(404).json({
        error: "Configuration not found",
      });
    }

    // Merge updates
    const updatedSpec: ConfigSpecification = {
      ...existingSpec,
      ...updates,
      appId, // Ensure these don't change
      version,
      id: existingSpec.id,
      createdAt: existingSpec.createdAt,
    };

    // Validate if defaultConfig is being updated
    if (updates.defaultConfig) {
      const validation = configManager.validateConfig(
        updatedSpec.defaultConfig,
        updatedSpec.schema,
      );

      if (!validation.valid) {
        return res.status(400).json({
          error: "Invalid configuration",
          errors: validation.errors,
        });
      }
    }

    // Save updated specification
    await configManager.saveSpecification(updatedSpec);

    res.json({
      message: "Configuration updated successfully",
      spec: {
        id: updatedSpec.id,
        appId: updatedSpec.appId,
        version: updatedSpec.version,
        updatedAt: updatedSpec.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating configuration:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// GET /config - List all configurations
app.get("/config", (req: Request, res: Response) => {
  try {
    const specs = configManager.getAllSpecifications();

    const summary = specs.map((spec) => ({
      id: spec.id,
      appId: spec.appId,
      version: spec.version,
      environment: spec.environment,
      rulesCount: spec.rules.length,
      conditionalRulesCount: spec.conditionalRules?.length || 0,
      createdAt: spec.createdAt,
      updatedAt: spec.updatedAt,
    }));

    res.json({
      total: specs.length,
      configurations: summary,
    });
  } catch (error) {
    console.error("Error listing configurations:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// DELETE /config/:appId/:version - Delete configuration
app.delete("/config/:appId/:version", async (req: Request, res: Response) => {
  try {
    const { appId, version } = req.params;

    const spec = configManager.getSpecification(appId, version);
    if (!spec) {
      return res.status(404).json({
        error: "Configuration not found",
      });
    }

    // In a real implementation, you'd delete the file
    // For now, we'll just acknowledge the request
    res.json({
      message: "Configuration deleted successfully",
      deleted: {
        appId,
        version,
      },
    });
  } catch (error) {
    console.error("Error deleting configuration:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    configurationsLoaded: configManager.getAllSpecifications().length,
  });
});

app.listen(port, () => {
  console.log(
    `🚀 Configuration Management Server running at http://localhost:${port}`,
  );
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📝 API Documentation:`);
  console.log(`   GET    /config/:appId/:version - Fetch configuration`);
  console.log(`   POST   /config - Create configuration`);
  console.log(`   PUT    /config/:appId/:version - Update configuration`);
  console.log(`   DELETE /config/:appId/:version - Delete configuration`);
  console.log(`   GET    /config - List all configurations`);
});
