/**
 * JavaScript Plugin Generator Wrapper
 */

const { PluginGenerator } = require("./create-plugin-core");

// Get plugin name from command line arguments
const pluginName = process.argv[2];

if (!pluginName) {
    console.error("❌ Plugin name is required!");
    console.log("Usage: npm run new-plugin-js <plugin-name>");
    console.log("Example: npm run new-plugin-js MyJSPlugin");
    process.exit(1);
}

// Create JavaScript plugin
const generator = new PluginGenerator();
generator.createPlugin(pluginName, "js");
