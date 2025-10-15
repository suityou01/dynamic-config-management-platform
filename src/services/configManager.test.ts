import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ConfigurationManager } from "./configManager";
import type { ConfigSpecification, ConfigSchema } from "./types";
import * as fs from "node:fs";
import * as path from "node:path";

// Mock the fs module
vi.mock("node:fs", () => ({
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock the path module
vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
}));

describe("ConfigurationManager", () => {
  let configManager: ConfigurationManager;
  const testConfigDir = "./test-config";

  beforeEach(() => {
    vi.clearAllMocks();
    configManager = new ConfigurationManager(testConfigDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with custom config directory", () => {
      const customDir = "./custom-dir";
      const manager = new ConfigurationManager(customDir);
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });

    it("should create instance with default config directory", () => {
      const manager = new ConfigurationManager();
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });
  });

  describe("initialize", () => {
    it("should create config directory and load specifications", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      await configManager.initialize();

      expect(fs.mkdir).toHaveBeenCalledWith(testConfigDir, { recursive: true });
      expect(fs.readdir).toHaveBeenCalledWith(testConfigDir);
    });

    it("should throw error if directory creation fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Permission denied");
      vi.mocked(fs.mkdir).mockRejectedValue(error);

      await expect(configManager.initialize()).rejects.toThrow(
        "Permission denied",
      );

      consoleErrorSpy.mockRestore();
    });

    it("should log error message when initialization fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Test error");
      vi.mocked(fs.mkdir).mockRejectedValue(error);

      await expect(configManager.initialize()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to initialize configuration manager:",
        error,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("loadAllSpecifications", () => {
    it("should load all JSON specification files", async () => {
      const mockSpec1: ConfigSpecification = {
        id: "spec1",
        appId: "app1",
        version: "1.0.0",
        schema: {
          version: "1.0.0",
          requiredKeys: [],
          optionalKeys: [],
          deprecatedKeys: [],
        },
        defaultConfig: {},
        rules: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockSpec2: ConfigSpecification = {
        id: "spec2",
        appId: "app2",
        version: "2.0.0",
        schema: {
          version: "2.0.0",
          requiredKeys: [],
          optionalKeys: [],
          deprecatedKeys: [],
        },
        defaultConfig: {},
        rules: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.readdir).mockResolvedValue([
        "app1-1.0.0.json",
        "app2-2.0.0.json",
      ]);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockSpec1))
        .mockResolvedValueOnce(JSON.stringify(mockSpec2));

      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await configManager.loadAllSpecifications();

      expect(fs.readdir).toHaveBeenCalledWith(testConfigDir);
      expect(fs.readFile).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Loaded 2 configuration specifications",
      );

      consoleLogSpy.mockRestore();
    });

    it("should ignore non-JSON files", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        "config.txt",
        "readme.md",
        "app1-1.0.0.json",
      ]);
      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify({
          id: "spec1",
          appId: "app1",
          version: "1.0.0",
          schema: {
            version: "1.0.0",
            requiredKeys: [],
            optionalKeys: [],
            deprecatedKeys: [],
          },
          defaultConfig: {},
          rules: [],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        }),
      );

      await configManager.loadAllSpecifications();

      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Read error");
      vi.mocked(fs.readdir).mockRejectedValue(error);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await configManager.loadAllSpecifications();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load specifications:",
        error,
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle empty directory", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await configManager.loadAllSpecifications();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Loaded 0 configuration specifications",
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe("saveSpecification", () => {
    it("should save specification to file and update in-memory map", async () => {
      const mockSpec: ConfigSpecification = {
        id: "spec1",
        appId: "testApp",
        version: "1.0.0",
        schema: {
          version: "1.0.0",
          requiredKeys: ["key1"],
          optionalKeys: [],
          deprecatedKeys: [],
        },
        defaultConfig: {},
        rules: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await configManager.saveSpecification(mockSpec);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("testApp-1.0.0.json"),
        expect.stringContaining('"appId": "testApp"'),
      );
      expect(mockSpec.updatedAt).toBeDefined();
    });

    it("should update existing specification", async () => {
      const mockSpec: ConfigSpecification = {
        id: "spec1",
        appId: "testApp",
        version: "1.0.0",
        schema: {
          version: "1.0.0",
          requiredKeys: [],
          optionalKeys: [],
          deprecatedKeys: [],
        },
        defaultConfig: {},
        rules: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await configManager.saveSpecification(mockSpec);

      // Update the spec
      mockSpec.schema.requiredKeys = ["newKey"];
      await configManager.saveSpecification(mockSpec);

      const retrieved = configManager.getSpecification("testApp", "1.0.0");
      expect(retrieved?.schema.requiredKeys).toContain("newKey");
    });

    it("should format JSON with proper indentation", async () => {
      const mockSpec: ConfigSpecification = {
        id: "spec1",
        appId: "testApp",
        version: "1.0.0",
        schema: {
          version: "1.0.0",
          requiredKeys: [],
          optionalKeys: [],
          deprecatedKeys: [],
        },
        defaultConfig: {},
        rules: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await configManager.saveSpecification(mockSpec);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const jsonContent = writeCall[1] as string;
      expect(jsonContent).toContain("\n");
    });
  });

  describe("getSpecification", () => {
    it("should return specification for valid appId and version", async () => {
      const mockSpec: ConfigSpecification = {
        id: "spec1",
        appId: "testApp",
        version: "1.0.0",
        schema: {
          version: "1.0.0",
          requiredKeys: [],
          optionalKeys: [],
          deprecatedKeys: [],
        },
        defaultConfig: {},
        rules: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      await configManager.saveSpecification(mockSpec);

      const result = configManager.getSpecification("testApp", "1.0.0");

      expect(result).toBeDefined();
      expect(result?.appId).toBe("testApp");
      expect(result?.version).toBe("1.0.0");
    });

    it("should return undefined for non-existent specification", () => {
      const result = configManager.getSpecification("nonExistent", "1.0.0");
      expect(result).toBeUndefined();
    });
  });

  describe("getAllSpecifications", () => {
    it("should return all loaded specifications", async () => {
      const mockSpec1: ConfigSpecification = {
        id: "spec1",
        appId: "app1",
        version: "1.0.0",
        schema: {
          version: "1.0.0",
          requiredKeys: [],
          optionalKeys: [],
          deprecatedKeys: [],
        },
        defaultConfig: {},
        rules: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockSpec2: ConfigSpecification = {
        id: "spec2",
        appId: "app2",
        version: "2.0.0",
        schema: {
          version: "2.0.0",
          requiredKeys: [],
          optionalKeys: [],
          deprecatedKeys: [],
        },
        defaultConfig: {},
        rules: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      await configManager.saveSpecification(mockSpec1);
      await configManager.saveSpecification(mockSpec2);

      const specs = configManager.getAllSpecifications();

      expect(specs).toHaveLength(2);
      expect(specs.map((s) => s.appId)).toContain("app1");
      expect(specs.map((s) => s.appId)).toContain("app2");
    });

    it("should return empty array when no specifications loaded", () => {
      const specs = configManager.getAllSpecifications();
      expect(specs).toEqual([]);
    });
  });

  describe("validateConfig", () => {
    const schema: ConfigSchema = {
      version: "1.0.0",
      requiredKeys: ["name", "version"],
      optionalKeys: ["description"],
      deprecatedKeys: ["oldKey"],
    };

    it("should validate correct configuration", () => {
      const config = {
        name: "TestApp",
        version: "1.0.0",
        description: "A test app",
      };

      const result = configManager.validateConfig(config, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing required keys", () => {
      const config = {
        name: "TestApp",
      };

      const result = configManager.validateConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required key: version");
    });

    it("should detect deprecated keys", () => {
      const config = {
        name: "TestApp",
        version: "1.0.0",
        oldKey: "deprecated value",
      };

      const result = configManager.validateConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Using deprecated key: oldKey");
    });

    it("should detect unknown keys", () => {
      const config = {
        name: "TestApp",
        version: "1.0.0",
        unknownKey: "value",
      };

      const result = configManager.validateConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Unknown key: unknownKey");
    });

    it("should detect multiple errors", () => {
      const config = {
        name: "TestApp",
        oldKey: "deprecated",
        unknownKey: "value",
      };

      const result = configManager.validateConfig(config, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain("Missing required key: version");
      expect(result.errors).toContain("Using deprecated key: oldKey");
      expect(result.errors).toContain("Unknown key: unknownKey");
    });

    it("should validate config with only required keys", () => {
      const config = {
        name: "TestApp",
        version: "1.0.0",
      };

      const result = configManager.validateConfig(config, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
