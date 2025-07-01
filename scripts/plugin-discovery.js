/**
 * Plugin Discovery Script
 * This script runs during build time to discover all plugins and generate a registry
 */

const fs = require("fs");
const path = require("path");

class PluginDiscovery {
    constructor(pluginsDir = "plugins", outputPath = "build/plugin-registry.json") {
        this.pluginsDir = path.resolve(pluginsDir);
        this.outputPath = path.resolve(outputPath);
    }

    /**
     * Discover all plugins in the plugins directory
     */
    discoverPlugins() {
        const registry = {
            plugins: [],
            manifest: {},
            buildTime: new Date().toISOString()
        };

        console.log(`🔍 Discovering plugins in: ${this.pluginsDir}`);

        if (!fs.existsSync(this.pluginsDir)) {
            console.log("⚠️  Plugins directory not found, creating empty registry");
            return registry;
        }

        const pluginDirs = fs
            .readdirSync(this.pluginsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const pluginDir of pluginDirs) {
            const pluginPath = path.join(this.pluginsDir, pluginDir);
            const manifest = this.loadPluginManifest(pluginPath);

            if (manifest) {
                registry.plugins.push(pluginPath);
                registry.manifest[manifest.name] = manifest;
                console.log(`✅ Found plugin: ${manifest.name} v${manifest.version}`);
            } else {
                console.log(`❌ Invalid plugin: ${pluginDir} (missing or invalid plugin.json)`);
            }
        }

        console.log(`📦 Discovered ${registry.plugins.length} plugins`);
        return registry;
    }

    /**
     * Load and validate plugin manifest
     */
    loadPluginManifest(pluginPath) {
        try {
            const manifestPath = path.join(pluginPath, "plugin.json");

            if (!fs.existsSync(manifestPath)) {
                return null;
            }

            const manifestContent = fs.readFileSync(manifestPath, "utf-8");
            const manifest = JSON.parse(manifestContent);

            // Validate required fields
            if (!manifest.name || !manifest.version || !manifest.main) {
                console.log(`⚠️  Invalid manifest in ${pluginPath}: missing required fields (name, version, main)`);
                return null;
            }

            // Check if main file exists
            const mainFile = path.join(pluginPath, manifest.main);
            const mainTsFile = mainFile.replace(/\.js$/, ".ts");

            if (!fs.existsSync(mainFile) && !fs.existsSync(mainTsFile)) {
                console.log(`⚠️  Main file not found: ${mainFile} or ${mainTsFile}`);
                return null;
            }

            return manifest;
        } catch (error) {
            console.log(`❌ Failed to load manifest from ${pluginPath}:`, error.message);
            return null;
        }
    }

    /**
     * Save the plugin registry to file
     */
    saveRegistry(registry) {
        try {
            // Ensure output directory exists
            const outputDir = path.dirname(this.outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(this.outputPath, JSON.stringify(registry, null, 2));
            console.log(`💾 Plugin registry saved to: ${this.outputPath}`);
        } catch (error) {
            console.error(`❌ Failed to save plugin registry:`, error.message);
            process.exit(1);
        }
    }

    /**
     * Main execution function
     */
    run() {
        console.log("🚀 Starting plugin discovery...");

        const registry = this.discoverPlugins();
        this.saveRegistry(registry);

        console.log("✨ Plugin discovery completed!");
    }
}

// Run the plugin discovery if this script is executed directly
if (require.main === module) {
    const discovery = new PluginDiscovery();
    discovery.run();
}

module.exports = { PluginDiscovery };
