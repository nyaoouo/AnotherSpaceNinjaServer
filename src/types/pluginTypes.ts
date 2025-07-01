export interface IPlugin {
    /**
     * Plugin name
     */
    name: string;

    /**
     * Plugin version
     */
    version: string;

    /**
     * Plugin description
     */
    description?: string;

    /**
     * Plugin author
     */
    author?: string;

    /**
     * Initialize the plugin
     */
    initialize(): Promise<void> | void;

    /**
     * Cleanup plugin resources
     */
    cleanup?(): Promise<void> | void;

    /**
     * Plugin configuration
     */
    config?: Record<string, unknown>;
}

export interface PluginManifest {
    name: string;
    version: string;
    description?: string;
    author?: string;
    main: string;
    dependencies?: string[];
    config?: Record<string, unknown>;
}

export interface PluginInfo {
    manifest: PluginManifest;
    path: string;
    enabled: boolean;
}
