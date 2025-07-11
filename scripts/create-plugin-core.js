/**
 * Plugin Generator Script
 * Creates new plugin templates for both TypeScript and JavaScript
 */

const fs = require("fs");
const path = require("path");

class PluginGenerator {
    constructor() {
        this.pluginsDir = path.resolve("plugins");
    }

    /**
     * Create a new plugin
     */
    createPlugin(name, language = "ts") {
        if (!name) {
            console.error("❌ Plugin name is required!");
            console.log("Usage: node create-plugin.js <plugin-name> [ts|js]");
            process.exit(1);
        }

        if (!["ts", "js"].includes(language)) {
            console.error("❌ Language must be 'ts' or 'js'");
            process.exit(1);
        }

        const pluginDir = path.join(this.pluginsDir, name);

        // Check if plugin already exists
        if (fs.existsSync(pluginDir)) {
            console.error(`❌ Plugin '${name}' already exists!`);
            process.exit(1);
        }

        console.log(`🚀 Creating ${language.toUpperCase()} plugin: ${name}`);

        // Create plugin directory
        this.createDirectory(pluginDir);

        // Create plugin files
        this.createPluginManifest(pluginDir, name);

        if (language === "ts") {
            this.createTypeScriptPlugin(pluginDir, name);
        } else {
            this.createJavaScriptPlugin(pluginDir, name);
        }

        console.log(`✅ Plugin '${name}' created successfully!`);
        console.log(`📁 Location: ${pluginDir}`);
        console.log(`🔧 Next steps:`);
        console.log(`   1. Edit ${path.join(pluginDir, `index.${language}`)} to implement your plugin logic`);
        console.log(`   2. Update ${path.join(pluginDir, "plugin.json")} if needed`);
        console.log(`   3. Run 'npm run build' to build the plugin`);
    }

    /**
     * Create directory if it doesn't exist
     */
    createDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Create plugin manifest file
     */
    createPluginManifest(pluginDir, name) {
        const manifest = {
            name: name,
            version: "1.0.0",
            description: `${name} plugin for Warframe Emulator`,
            main: "index.js",
            author: "Your Name",
            license: "GNU",
            config: {
                enabled: true
            },
            dependencies: {},
            tags: ["custom"]
        };

        const manifestPath = path.join(pluginDir, "plugin.json");
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`📝 Created: plugin.json`);
    }

    /**
     * Create TypeScript plugin template
     */
    createTypeScriptPlugin(pluginDir, name) {
        const template = `import { PluginBase } from "@/src/utils/plugin-base";
import { PluginManifest } from "@/src/types/pluginTypes";

export default class ${name} extends PluginBase {
    constructor(manifest: PluginManifest) {
        super(manifest);
    }

    async initialize(): Promise<void> {
        this.logger.info(\`Plugin initialized successfully!\`);

        // Add your plugin initialization logic here
        // For example:
        // - Register new routes
        // - Add new API endpoints
        // - Set up event listeners
        // - Connect to external services

        await Promise.resolve(); // Remove this line and add your actual logic
    }

    async cleanup(): Promise<void> {
        this.logger.info(\`Plugin cleanup completed\`);

        // Add your cleanup logic here
        // For example:
        // - Close database connections
        // - Clear timers/intervals
        // - Remove event listeners
        // - Cleanup resources

        await Promise.resolve(); // Remove this line and add your actual logic
    }

    // Add your custom methods here
    // Example:
    // public async customMethod(): Promise<void> {
    //     logger.info(\`Custom method called\`);
    // }
}
`;

        const pluginPath = path.join(pluginDir, "index.ts");
        fs.writeFileSync(pluginPath, template);
        console.log(`📝 Created: index.ts`);
    }

    /**
     * Create JavaScript plugin template
     */
    createJavaScriptPlugin(pluginDir, name) {
        throw new Error("JavaScript plugin generation is not implemented yet. Please use TypeScript for now.");
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const pluginName = args[0];
const language = args[1] || "ts";

// Validate plugin name
if (!pluginName) {
    console.error("❌ Plugin name is required!");
    console.log("Usage:");
    console.log("  node scripts/create-plugin.js <plugin-name> [ts|js]");
    console.log("");
    console.log("Examples:");
    console.log("  node scripts/create-plugin.js MyAwesomePlugin ts");
    console.log("  node scripts/create-plugin.js MyJSPlugin js");
    process.exit(1);
}

// Validate plugin name format
if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(pluginName)) {
    console.error("❌ Plugin name must start with a letter and contain only letters, numbers, and underscores!");
    process.exit(1);
}

// Create the plugin
if (require.main === module) {
    const generator = new PluginGenerator();
    generator.createPlugin(pluginName, language);
}

module.exports = { PluginGenerator };
