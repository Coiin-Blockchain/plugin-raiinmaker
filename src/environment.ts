import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { z } from "zod";

// Add environment setting to schema
export const raiinmakerEnvironment = z.object({
    RAIINMAKER_APP_ID: z.string().min(1, "RAIINMAKER_APP_ID is required"),
    RAIINMAKER_API_KEY: z.string().min(1, "RAIINMAKER_API_KEY is required"),
    RAIINMAKER_ENVIRONMENT: z.enum(["development", "staging", "production"]).default("development")
});

export type raiinmakerConfig = z.infer<typeof raiinmakerEnvironment>;

export async function validateRaiinmakerConfig(
    runtime: IAgentRuntime, 
    options: { allowMissing?: boolean, silent?: boolean } = {}
): Promise<raiinmakerConfig> {
    try {
        const config = {
            RAIINMAKER_API_KEY: runtime.getSetting("RAIINMAKER_API_KEY") || process.env.RAIINMAKER_API_KEY,
            RAIINMAKER_APP_ID: runtime.getSetting("RAIINMAKER_APP_ID") || process.env.RAIINMAKER_APP_ID,
            RAIINMAKER_ENVIRONMENT: runtime.getSetting("RAIINMAKER_ENVIRONMENT") || 
                                   process.env.RAIINMAKER_ENVIRONMENT || 
                                   "development"
        };

        const result = raiinmakerEnvironment.safeParse(config);
        
        if (!result.success) {
            // Format the error message with proper template string
            const errorMessages = result.error.errors.map(
                (err) => `${err.path.join(".")}: ${err.message}`
            ).join("\n");
            
            const errorMessage = `Raiinmaker API configuration failed:\n${errorMessages}`;
            
            if (!options.silent) {
                elizaLogger.error(errorMessage);
            }
            
            throw new Error(errorMessage);
        }
        
        return result.data;
    } catch (error) {
        if (!options.silent) {
            elizaLogger.error("Error validating Raiinmaker config:", error);
        }
        
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(
                (err) => `${err.path.join(".")}: ${err.message}`
            ).join("\n");
            
            throw new Error(`Raiinmaker API configuration failed:\n${errorMessages}`);
        }
        throw error;
    }
}

// Add a utility function to check if we're in development mode
export async function isDevelopmentEnvironment(runtime: IAgentRuntime): Promise<boolean> {
    try {
        const config = await validateRaiinmakerConfig(runtime, { silent: true });
        return config.RAIINMAKER_ENVIRONMENT === "development";
    } catch (error) {
        // Default to false (more restrictive) if we can't determine environment
        return false;
    }
}

// Create a function to check if an action is allowed in the current environment
export async function isActionAllowedInEnvironment(
    runtime: IAgentRuntime,
    actionName: string,
    options: { developmentOnly?: boolean, allowedEnvironments?: string[] } = {}
): Promise<boolean> {
    try {
        const config = await validateRaiinmakerConfig(runtime, { silent: true });
        const currentEnv = config.RAIINMAKER_ENVIRONMENT;
        
        // If action is development-only
        if (options.developmentOnly && currentEnv !== "development") {
            elizaLogger.warn(`Action ${actionName} is only available in development environment`);
            return false;
        }
        
        // If action is restricted to specific environments
        if (options.allowedEnvironments && !options.allowedEnvironments.includes(currentEnv)) {
            elizaLogger.warn(`Action ${actionName} is not available in ${currentEnv} environment`);
            return false;
        }
        
        return true;
    } catch (error) {
        elizaLogger.error(`Error checking environment permissions for ${actionName}:`, error);
        // Default to false (more restrictive) if we can't determine environment
        return false;
    }
}