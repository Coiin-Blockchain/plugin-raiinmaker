import { 
    Action,
    IAgentRuntime,
    Memory,
    State,
    ActionExample,
    HandlerCallback,
    elizaLogger,
    Handler
} from "@elizaos/core";
import { createRaiinmakerService } from "../services/raiinmakerService";
import { validateRaiinmakerConfig } from "../environment";
import { getDataVerificationExample } from "../examples";

export const getDataVerification: Action = {
    name: "GET_RAIIN_DATA_VERIFICATION",
    similes: [
        "VERIFY_DATA",
        "CHECK_DATA",
        "GET_RAIIN_VERIFICATION_DATA",
        "GET_RAIIN_VERIFICATION"
    ],
    description: "Verifies data through the Raiinmaker validation service",
    examples: getDataVerificationExample as ActionExample[][],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            await validateRaiinmakerConfig(runtime);
            return true;
        } catch (error) {
            elizaLogger.error("Validation failed:", error);
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown; },
        callback: HandlerCallback
    ) => {
        try {
            // Get global credentials
            const config = await validateRaiinmakerConfig(runtime);
            if (!config) {
                callback({
                    text: `Raiinmaker API configuration is not properly set up.`,
                    proceed: false
                });
                return false;
            }
            
            // Create the service with global credentials
            const raiinService = createRaiinmakerService(
                config.RAIINMAKER_API_KEY,
                config.RAIINMAKER_APP_ID
            );

            // Get data verification
            const verificationResult = await raiinService.getDataVerification(
                message.content.text
            );
            elizaLogger.success("Successfully retrieved data verification");
    
            const {classification, message: verificationMessage, date, time} = verificationResult;
            
            // Format response based on classification
            let responseText = "";
            let proceed = false;
            
            switch(classification.toLowerCase()) {
                case "approved":
                case "valid":
                case "success":
                    responseText = `✅ The content has been verified and approved.\n\nVerification details:\n- Status: ${classification}\n- Message: ${verificationMessage}\n- Verified on: ${date} at ${time}`;
                    proceed = true;
                    break;
                    
                case "pending":
                case "processing":
                    responseText = `⏳ Your content is still being processed.\n\nVerification details:\n- Status: ${classification}\n- Message: ${verificationMessage}\n- Submitted on: ${date} at ${time}\n\nPlease check back later for the final result.`;
                    proceed = false;
                    break;
                    
                case "rejected":
                case "invalid":
                case "failed":
                    responseText = `❌ The content verification was not successful.\n\nVerification details:\n- Status: ${classification}\n- Reason: ${verificationMessage}\n- Verified on: ${date} at ${time}\n\nPlease review and modify your content according to the feedback.`;
                    proceed = false;
                    break;
                    
                default:
                    responseText = `ℹ️ Verification result received.\n\nVerification details:\n- Status: ${classification}\n- Message: ${verificationMessage}\n- Processed on: ${date} at ${time}`;
                    proceed = false;
            }
            
            callback({
                text: responseText,
                proceed
            });
            return proceed;
        } catch (error) {
            elizaLogger.error("Error in getDataVerification handler:", error);
            callback({
                text: "I apologize, but I'm having trouble verifying the data at the moment. Please try again later.",
                proceed: false
            });
            return false;
        }
    }
} as Action;