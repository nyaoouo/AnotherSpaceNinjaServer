import { PluginBase } from "@/src/utils/plugin-base";
import { PluginManifest } from "@/src/types/pluginTypes";

export default class ExamplePlugin extends PluginBase {
    constructor(manifest: PluginManifest) {
        super(manifest);
    }

    async initialize(): Promise<void> {
        this.logger.info(`Plugin initialized successfully!`);

        // Add your plugin initialization logic here
        // For example:
        // - Register new routes
        // - Add new API endpoints
        // - Set up event listeners
        // - Connect to external services
        await Promise.resolve(); // Simulate async operation if needed
    }

    async cleanup(): Promise<void> {
        this.logger.info(`Plugin cleanup completed`);

        // Add your cleanup logic here
        // For example:
        // - Close database connections
        // - Clear timers/intervals
        // - Remove event listeners
        await Promise.resolve(); // Simulate async operation if needed
    }
}
