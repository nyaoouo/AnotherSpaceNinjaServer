import { IPlugin } from "@/src/types/pluginTypes";
import { logger } from "@/src/utils/logger";

export default class ExamplePlugin implements IPlugin {
    public name = "ExamplePlugin";
    public version = "1.0.0";
    public description = "Example plugin for the server";
    public author = "Your Name";

    async initialize(): Promise<void> {
        logger.info(`[${this.name}] Plugin initialized successfully!`);

        // Add your plugin initialization logic here
        // For example:
        // - Register new routes
        // - Add new API endpoints
        // - Set up event listeners
        // - Connect to external services
        await Promise.resolve(); // Simulate async operation if needed
    }

    async cleanup(): Promise<void> {
        logger.info(`[${this.name}] Plugin cleanup completed`);

        // Add your cleanup logic here
        // For example:
        // - Close database connections
        // - Clear timers/intervals
        // - Remove event listeners
        await Promise.resolve(); // Simulate async operation if needed
    }
}
