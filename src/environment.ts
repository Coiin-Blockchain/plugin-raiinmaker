import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { z } from "zod";

// Add environment setting to schema with OpenAI integration
export const raiinmakerEnvironment = z.object({
    RAIINMAKER_APP_ID: z.string().min(1, "RAIINMAKER_APP_ID is required"),
    RAIINMAKER_API_KEY: z.string().min(1, "RAIINMAKER_API_KEY is required"),
    RAIINMAKER_ENVIRONMENT: z.enum(["development", "staging", "production"]).default("development"),
    OPENAI_API_KEY: z.string().optional(), // Optional to allow fallback to human verification
    ENABLE_PRE_VERIFICATION: z.boolean().optional().default(true)
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
                                   "development",
            OPENAI_API_KEY: runtime.getSetting("OPENAI_API_KEY") || process.env.OPENAI_API_KEY,
            ENABLE_PRE_VERIFICATION: parseBoolean(runtime.getSetting("ENABLE_PRE_VERIFICATION") || 
                                              process.env.ENABLE_PRE_VERIFICATION || 
                                              "true")
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

// Add a helper utility to check if pre-verification is enabled
export async function isPreVerificationEnabled(runtime: IAgentRuntime): Promise<boolean> {
    try {
        const config = await validateRaiinmakerConfig(runtime, { silent: true });
        
        // If OpenAI API key is missing, pre-verification can't run
        if (!config.OPENAI_API_KEY) {
            return false;
        }
        
        return config.ENABLE_PRE_VERIFICATION === true;
    } catch (error) {
        // Default to false if we can't determine
        return false;
    }
}

// Helper function to parse boolean values from string environment variables
function parseBoolean(value: string | undefined | null): boolean {
    if (!value) return true; // Default to true
    
    const lowercased = value.toLowerCase();
    return !['false', '0', 'no', 'off', 'disabled'].includes(lowercased);
}