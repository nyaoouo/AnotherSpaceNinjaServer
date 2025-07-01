import { logger } from "@/src/utils/logger";
import { pluginManager } from "@/src/managers/pluginManager";

process.on("SIGINT", () => {
    logger.info("Received SIGINT, starting graceful shutdown...");
    void pluginManager.cleanup().then(() => {
        process.exit(0);
    });
});

process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, starting graceful shutdown...");
    void pluginManager.cleanup().then(() => {
        process.exit(0);
    });
});

void pluginManager.loadPlugins().then(() => {
    logger.info("All plugins loaded successfully.");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    void require("./index");
});
