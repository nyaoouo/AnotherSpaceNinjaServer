import { logger } from "@/src/utils/logger";
import { IPlugin, PluginInfo, PluginManifest } from "@/src/types/pluginTypes";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

interface PluginRegistry {
    plugins: string[];
}

interface PluginModule {
    default?:
        | (new () => IPlugin)
        | {
              default?: new () => IPlugin;
          };
    [key: string]: unknown;
}

interface PluginConfig {
    enabled?: boolean;
    [key: string]: unknown;
}

export class PluginManager {
    private plugins: Map<string, IPlugin> = new Map();
    private pluginInfos: Map<string, PluginInfo> = new Map();
    private pluginsDir: string;

    constructor(pluginsDir: string = "plugins") {
        this.pluginsDir = path.resolve(pluginsDir);
    }

    /**
     * Load all plugins from the plugins directory
     */
    async loadPlugins(): Promise<void> {
        try {
            // Load plugin registry generated at build time
            const pluginRegistryPath = path.resolve("build/plugin-registry.json");
            if (!fs.existsSync(pluginRegistryPath)) {
                logger.info("No plugin registry found, skipping plugin loading");
                return;
            }

            const pluginRegistry = JSON.parse(fs.readFileSync(pluginRegistryPath, "utf-8")) as PluginRegistry;
            logger.info(`Found ${pluginRegistry.plugins.length} plugins in registry`);

            for (const pluginPath of pluginRegistry.plugins) {
                await this.loadPlugin(pluginPath);
            }

            logger.info(`Successfully loaded ${this.plugins.size} plugins`);
        } catch (error) {
            logger.error("Failed to load plugins:", error);
        }
    }

    /**
     * Load a single plugin
     */
    private async loadPlugin(pluginPath: string): Promise<void> {
        try {
            const absolutePath = path.resolve(pluginPath);
            const manifestPath = path.join(absolutePath, "plugin.json");

            if (!fs.existsSync(manifestPath)) {
                logger.warn(`Plugin manifest not found: ${manifestPath}`);
                return;
            }

            const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as PluginManifest;

            // Check if plugin is enabled from config
            const pluginConfig = manifest.config as PluginConfig | undefined;
            const pluginInfo: PluginInfo = {
                manifest,
                path: absolutePath,
                enabled: pluginConfig?.enabled ?? true
            };

            if (!pluginInfo.enabled) {
                logger.info(`Plugin ${manifest.name} is disabled, skipping`);
                return;
            }

            // Load the plugin module from build directory
            const pluginName = path.basename(absolutePath);
            const buildPluginPath = path.resolve("build/plugins", pluginName);
            const mainFile = path.join(buildPluginPath, manifest.main || "index.js");
            if (!fs.existsSync(mainFile)) {
                logger.error(`Plugin main file not found: ${mainFile}`);
                return;
            }

            const pluginModule = (await import(pathToFileURL(mainFile).href)) as PluginModule;

            let PluginClass: (new () => IPlugin) | undefined;

            if (typeof pluginModule.default === "function") {
                PluginClass = pluginModule.default;
            } else if (typeof pluginModule.default === "object" && pluginModule.default.default) {
                PluginClass = pluginModule.default.default;
            } else if (pluginModule[manifest.name]) {
                PluginClass = pluginModule[manifest.name] as new () => IPlugin;
            }

            if (!PluginClass) {
                logger.error(`Plugin class not found in ${mainFile}`);
                return;
            }

            const plugin = new PluginClass();

            // Validate plugin interface
            if (!this.validatePlugin(plugin)) {
                logger.error(`Plugin ${manifest.name} does not implement required interface`);
                return;
            }

            // Initialize the plugin
            await Promise.resolve(plugin.initialize());

            this.plugins.set(manifest.name, plugin);
            this.pluginInfos.set(manifest.name, pluginInfo);

            logger.info(`Loaded plugin: ${manifest.name} v${manifest.version}`);
        } catch (error) {
            logger.error(`Failed to load plugin from ${pluginPath}:`, error);
        }
    }

    /**
     * Validate that a plugin implements the required interface
     */
    private validatePlugin(plugin: unknown): plugin is IPlugin {
        return (
            plugin != null &&
            typeof plugin === "object" &&
            "name" in plugin &&
            "version" in plugin &&
            "initialize" in plugin &&
            typeof (plugin as Record<string, unknown>).name === "string" &&
            typeof (plugin as Record<string, unknown>).version === "string" &&
            typeof (plugin as Record<string, unknown>).initialize === "function"
        );
    }

    /**
     * Get a plugin by name
     */
    getPlugin(name: string): IPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * Get all loaded plugins
     */
    getAllPlugins(): Map<string, IPlugin> {
        return new Map(this.plugins);
    }

    /**
     * Get plugin info
     */
    getPluginInfo(name: string): PluginInfo | undefined {
        return this.pluginInfos.get(name);
    }

    /**
     * Cleanup all plugins
     */
    async cleanup(): Promise<void> {
        logger.info("Cleaning up plugins...");

        for (const [name, plugin] of this.plugins) {
            try {
                if (plugin.cleanup) {
                    await Promise.resolve(plugin.cleanup());
                }
                logger.info(`Cleaned up plugin: ${name}`);
            } catch (error) {
                logger.error(`Failed to cleanup plugin ${name}:`, error);
            }
        }

        this.plugins.clear();
        this.pluginInfos.clear();
    }
}

// Global plugin manager instance
export const pluginManager = new PluginManager();
