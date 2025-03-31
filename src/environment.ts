import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { z } from "zod";

export const raiinmakerEnvironment = z.object({
    RAIINMAKER_APP_ID: z.string().min(1, "RAIINMAKER_APP_ID is required"),
    RAIINMAKER_API_KEY: z.string().min(1, "RAIINMAKER_API_KEY is required")
});

export type raiinmakerConfig = z.infer<typeof raiinmakerEnvironment>;

export async function validateRaiinmakerConfig(
    runtime: IAgentRuntime, 
    options: { allowMissing?: boolean, silent?: boolean } = {}
): Promise<raiinmakerConfig> {
    try {
        const config = {
            RAIINMAKER_API_KEY: runtime.getSetting("RAIINMAKER_API_KEY") || process.env.RAIINMAKER_API_KEY,
            RAIINMAKER_APP_ID: runtime.getSetting("RAIINMAKER_APP_ID") || process.env.RAIINMAKER_APP_ID
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