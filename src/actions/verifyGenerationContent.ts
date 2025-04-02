// src/actions/verifyGenerationContent.ts
import { 
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    ActionExample
} from "@elizaos/core";
import { createRaiinmakerService, RaiinmakerApiError } from "../services/raiinmakerService";
import { preVerifyContent } from "../services/contentPreVerificationService";
import { extractVerifiableContent } from "../utils/contentExtractor";
import { ensureUUID } from "../utils/uuidHelpers";
import { z } from "zod";
import { validateRaiinmakerConfig } from "../environment";

// Define options schema for the action
const verifyGenerationContentOptionsSchema = z.object({
    content: z.string().min(1, "Content is required").optional(),
    consensusVotes: z.number().min(1).optional(),
    question: z.string().optional(),
    roomId: z.string().optional(),
    name: z.string().optional(),
    // Add option to skip pre-verification for testing/comparison
    skipPreVerification: z.boolean().optional(),
}).optional();

// Action examples (existing code)
const verifyGenerationContentExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Please verify this content: \"Hello world, this is a test tweet!\""
            }
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll submit that content for verification.",
                action: "VERIFY_GENERATION_CONTENT"
            }
        }
    ]
];

export const verifyGenerationContent: Action = {
    name: "VERIFY_GENERATION_CONTENT",
    similes: [
        "CHECK_CONTENT",
        "VALIDATE_TWEET",
        "VERIFY_TWEET",
        "VERIFY_POST"
    ],
    description: "Submits content to the Raiinmaker app for verification to determine if it's appropriate for posting",
    examples: verifyGenerationContentExamples,
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            // Validate that the environment has the required credentials
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
        state?: State,
        options?: { [key: string]: unknown; },
        callback?: HandlerCallback
    ) => {
        try {
            // Parse and validate options
            const parsedOptions = verifyGenerationContentOptionsSchema.parse(options);
            
            // Get credentials from environment
            const config = await validateRaiinmakerConfig(runtime);
            
            if (!config) {
                if (callback) {
                    callback({
                        text: `
Raiinmaker API configuration is not properly set up. 

Please ensure the following environment variables are set:
- RAIINMAKER_APP_ID: Your Raiinmaker application ID
- RAIINMAKER_API_KEY: Your Raiinmaker API key
                        `
                    });
                }
                return false;
            }

            // Extract content from message or options
            let contentToVerify: string;
            if (parsedOptions && parsedOptions.content) {
                contentToVerify = parsedOptions.content;
            } else {
                contentToVerify = extractVerifiableContent(message.content.text);
            }
            
            // Verify we have content to check
            if (!contentToVerify || contentToVerify.trim().length === 0) {
                if (callback) {
                    callback({
                        text: "I couldn't identify any content to verify. Please provide some content by quoting it or clearly indicating what you'd like me to verify."
                    });
                }
                return false;
            }
            
            const userId = ensureUUID(message.userId);
            elizaLogger.info(`Processing verification for content from user ${userId}`);

            // NEW: Pre-verification step with OpenAI
            let preVerificationResult: Awaited<ReturnType<typeof preVerifyContent>> | undefined;
            
            if (!parsedOptions?.skipPreVerification) {
                elizaLogger.info("Running content pre-verification check");
                
                // Get any custom checklist from character settings if available
                let customChecklist: string[] | undefined;
                
                // Safely access the contentChecklist from settings using type assertion
                const settings = runtime.character?.settings as Record<string, any>;
                if (settings && Array.isArray(settings.contentChecklist)) {
                    customChecklist = settings.contentChecklist;
                    elizaLogger.debug("Using custom content checklist from character settings");
                }
                
                preVerificationResult = await preVerifyContent(
                    runtime,
                    contentToVerify,
                    customChecklist
                );
                
                // If content passes pre-verification, return success and skip human verification
                if (preVerificationResult.passes) {
                    elizaLogger.info("Content passed pre-verification checks, skipping human verification");
                    
                    // Create a deterministic task ID for auto-verified content
                    const autoVerifiedTaskId = ensureUUID(`auto-verified-${Date.now()}`);
                    
                    if (callback) {
                        callback({
                            text: `
I've analyzed your content using AI verification and it looks good to go!

📋 Content: "${contentToVerify.substring(0, 100)}${contentToVerify.length > 100 ? '...' : ''}"

✅ All guidelines passed
• Content is appropriate for posting
• No policy violations found

The content has been approved automatically. No human verification was needed.
                            `,
                            status: "approved",
                            skipHumanVerification: true,
                            // Add these fields for Twitter client compatibility
                            taskId: autoVerifiedTaskId,
                            verificationResult: {
                                taskId: autoVerifiedTaskId,
                                status: "completed",
                                answer: true,
                                question: "Is this content appropriate for posting?",
                                subject: contentToVerify,
                                votesReceived: 0,
                                votesRequired: 0,
                                votesYes: 0,
                                votesNo: 0,
                                formattedText: `✅ Content Verification - The verification is complete. The content was approved automatically by AI.`
                            }
                        });
                    }
                    
                    // Create a memory to track this auto-approved verification
                    await runtime.messageManager.createMemory({
                        id: ensureUUID(`verification-auto-approved-${Date.now()}`),
                        userId: userId,
                        agentId: ensureUUID(runtime.agentId),
                        content: { 
                            text: `Content auto-approved by AI verification: "${contentToVerify.substring(0, 50)}..."`,
                            metadata: {
                                taskType: "contentAutoApproved",
                                taskId: autoVerifiedTaskId,
                                content: contentToVerify,
                                timestamp: Date.now()
                            }
                        },
                        roomId: ensureUUID(parsedOptions?.roomId || message.roomId),
                        createdAt: Date.now()
                    });
                    
                    return true;
                }
                
                elizaLogger.info(`Content failed pre-verification checks: ${preVerificationResult.failedChecks.join(', ')}`);
                elizaLogger.info("Content failed pre-verification, proceeding to human verification");
            }
            
            // Only continue with Raiinmaker human verification if pre-verification failed or was skipped
            if (parsedOptions?.skipPreVerification || (preVerificationResult && !preVerificationResult.passes)) {
                const raiinService = createRaiinmakerService(
                    config.RAIINMAKER_API_KEY,
                    config.RAIINMAKER_APP_ID
                );

                // Create verification task
                const taskOptions = {
                    name: parsedOptions?.name || "Content Verification",
                    consensusVotes: parsedOptions?.consensusVotes || 3,
                    question: parsedOptions?.question || "Is this content appropriate for an AI agent to post?"
                };

                const verificationResult = await raiinService.createGenerationVerificationTask(
                    contentToVerify,
                    taskOptions
                );

                if (!verificationResult || !verificationResult.data || !verificationResult.data.id) {
                    elizaLogger.error("Failed to create verification task: Invalid response from Raiinmaker service");
                    if (callback) {
                        callback({
                            text: "I apologize, but I wasn't able to submit the content for verification. There might be an issue with the verification service."
                        });
                    }
                    return false;
                }

                // Get the task ID
                const taskId = verificationResult.data.id;
                
                // Use the roomId provided in options, message roomId, or create a consistent one
                const roomId = ensureUUID(parsedOptions?.roomId || message.roomId);
                
                // Create a memory to track this verification
                await runtime.messageManager.createMemory({
                    id: ensureUUID(`verification-${taskId}`),
                    userId: userId,
                    agentId: ensureUUID(runtime.agentId),
                    content: { 
                        text: `Verification task created for "${contentToVerify.substring(0, 50)}..." with ID: ${taskId}`,
                        metadata: {
                            taskType: "contentVerification",
                            taskId: taskId,
                            content: contentToVerify,
                            timestamp: Date.now()
                        }
                    },
                    roomId: roomId,
                    createdAt: Date.now()
                });
                
                if (callback) {
                    callback({
                        text: `
I've submitted your content for verification through the Raiinmaker network.

📋 Content: "${contentToVerify.substring(0, 100)}${contentToVerify.length > 100 ? '...' : ''}"

🔍 Task ID: ${taskId}

The content will be reviewed by human validators in the Raiinmaker network. They'll determine if the content is appropriate for posting based on community guidelines.

You can check the status of this verification later by asking me about this task using the Task ID.

⏳ The verification process typically takes a few minutes to a few hours, depending on validator availability.
                        `,
                        taskId: taskId,
                        status: "pending"
                    });
                }
            }
            
            return true;
        } catch (error) {
            if (error instanceof RaiinmakerApiError) {
                elizaLogger.error(`Raiinmaker API Error: ${error.message}`, error);
                callback?.({
                    text: `There was an error with the Raiinmaker API: ${error.message}\n\nThis might indicate an issue with your API credentials or the API service.`
                });
            } else {
                elizaLogger.error("Error in verifyGenerationContent handler:", error);
                callback?.({
                    text: "I apologize, but I'm having trouble submitting the content for verification at the moment. Please try again later."
                });
            }
            return false;
        }
    }
};