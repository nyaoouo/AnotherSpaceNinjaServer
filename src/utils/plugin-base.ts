import { logger } from "@/src/utils/logger";
import type { IPlugin, PluginManifest } from "../types/pluginTypes";

export class PluginBase implements IPlugin {
    manifest: PluginManifest;
    logger: ReturnType<typeof logger.child>;

    get name(): string {
        return this.manifest.name;
    }
    get version(): string {
        return this.manifest.version;
    }
    get description(): string | undefined {
        return this.manifest.description;
    }
    get author(): string | undefined {
        return this.manifest.author;
    }

    constructor(manifest: PluginManifest) {
        this.manifest = manifest;
        this.logger = logger.child({
            module: this.name
        });
    }

    async initialize(): Promise<void> {
        return Promise.resolve();
    }

    async cleanup(): Promise<void> {
        return Promise.resolve();
    }
}
