import { 
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    ActionExample,
    elizaLogger
} from "@elizaos/core";
import { createRaiinmakerService, RaiinmakerApiError } from "../services/raiinmakerService";
import { ensureUUID } from "../utils/uuidHelpers";
import { formatTaskStatus } from "../utils/taskFormatter";
import { z } from "zod";
import { raiinmakerEnvironment, validateRaiinmakerConfig } from "../environment";

// Create example usage patterns for the action
const checkVerificationStatusExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's the status of my content verification with task ID abc123?"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check the status of your verification task.",
                action: "CHECK_VERIFICATION_STATUS",
            },
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Has my tweet been verified yet? The task ID is xyz789."
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check if your tweet has been verified.",
                action: "CHECK_VERIFICATION_STATUS",
            },
        }
    ],
];

// Define options schema for the action
const checkVerificationStatusOptionsSchema = z.object({
    taskId: z.string().min(1, "Task ID is required").optional()
}).optional();

export const checkVerificationStatus: Action = {
    name: "CHECK_VERIFICATION_STATUS",
    similes: [
        "GET_VERIFICATION_STATUS",
        "CHECK_CONTENT_STATUS",
        "VERIFY_STATUS",
        "CHECK_TASK_STATUS"
    ],
    description: "Checks the status of a content verification task in the Raiinmaker app",
    examples: checkVerificationStatusExamples,
    
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
            // Get credentials from environment
            const config = await validateRaiinmakerConfig(runtime);
            
            if (!config) {
                if (callback) {
                    callback({
                        text: `No Raiinmaker credentials available. Please set up credentials first.`
                    });
                }
                return false;
            }
            
            // Create the service with environment credentials
            const raiinService = createRaiinmakerService(
                config.RAIINMAKER_API_KEY,
                config.RAIINMAKER_APP_ID
            );

            // Parse options using schema
            const parsedOptions = checkVerificationStatusOptionsSchema.parse(options);

            // Extract task ID from message or options
            let taskId: string | undefined;

            if (parsedOptions && parsedOptions.taskId) {
                taskId = parsedOptions.taskId;
            } else {
                // Try multiple patterns to match task IDs
                const messageText = message.content.text;
                const idMatch = messageText.match(/task\s*ID\s*(?:is|:|=)?\s*([a-zA-Z0-9-]+)/i) || 
                                messageText.match(/(?:check|verify|status|task)\s*(?:for|of)?\s*([a-f0-9-]{8,})/i) ||
                                messageText.match(/([a-f0-9-]{8,})/i);
                
                if (idMatch && idMatch[1]) {
                    taskId = idMatch[1];
                } else {
                    // Try to find a taskId in recent memory
                    const recentMemories = await runtime.messageManager.getMemories({
                        roomId: message.roomId,
                        count: 10
                    });
                    
                    // Look for task ID in recent messages (especially in metadata)
                    for (const mem of recentMemories) {
                        const metadata = mem?.content?.metadata;
                        
                        if (metadata && typeof metadata === 'object' && 'taskId' in metadata && typeof metadata.taskId === 'string') {
                            taskId = metadata.taskId;
                            break;
                        } else if (mem.content?.text && typeof mem.content.text === 'string') {
                            // Try to extract from text
                            const textMatch = mem.content.text.match(/task\s*ID\s*(?:is|:|=)?\s*([a-zA-Z0-9-]+)/i) || 
                                            mem.content.text.match(/([a-f0-9-]{8,})/i);
                            
                            if (textMatch && textMatch[1]) {
                                taskId = textMatch[1];
                                break;
                            }
                        }
                    }
                    
                    // If we still don't have a taskId
                    if (!taskId) {
                        if (callback) {
                            callback({
                                text: "I couldn't find a task ID in your message or our recent conversation. Please provide a valid task ID to check the verification status."
                            });
                        }
                        return false;
                    }
                }
            }

            // Now taskId is guaranteed to be defined if we reach here
            // Get task details
            const taskResult = await raiinService.getTaskById(taskId as string);

            elizaLogger.info(`TASK RESULT FROM RAIINMAKER API: ${JSON.stringify(taskResult, null, 2)}`);
            
            if (!taskResult.success || !taskResult.data) {
                if (callback) {
                    callback({
                        text: `I couldn't find any verification task with ID ${taskId}. Please check the ID and try again.`,
                        // Add these fields explicitly
                        status: "unknown",
                        answer: null
                    });
                }
                return false;
            }

            const task = taskResult.data;
            const status = task.status;
            const votes = task.votes || [];
            const totalVotes = votes.length;
            const requiredVotes = task.consensusVotes;
            const answer = task.answer;

            elizaLogger.info(`Raw task data: status=${status}, answer=${answer}`);

            let statusMessage: string;
            let isApproved = false;
            
            if (status === 'completed') {
                if (answer === 'true' || answer === 'yes') {
                    isApproved = true;
                    statusMessage = `The verification is complete! The content was approved.`;
                } else {
                    isApproved = false;
                    statusMessage = `The verification is complete! The content was rejected.`;
                }
            } else if (status === 'pending') {
                statusMessage = `The verification is still in progress. So far, ${totalVotes} out of ${requiredVotes} required votes have been collected.`;
            } else {
                statusMessage = `The verification task is currently in ${status} status.`;
            }

            let voteInfo = '';
            if (votes.length > 0) {
                const yesVotes = votes.filter(v => v.answer === 'true').length;
                const noVotes = votes.filter(v => v.answer === 'false').length;
                voteInfo = `\n\nCurrent votes: ${yesVotes} approve, ${noVotes} reject.`;
            }

            // Use the formatTaskStatus helper if available
            let formattedOutput = '';
            try {
                formattedOutput = formatTaskStatus(task);
            } catch (error) {
                // Fall back to simple formatting if helper isn't available
                formattedOutput = `
Verification Task Status:

Task ID: ${task.id}
Subject: "${task.subject}"
Question: "${task.question}"
Status: ${status}
${statusMessage}${voteInfo}
`;
            }

            if (callback) {
                callback({
                    text: formattedOutput,
                    // Important: Add these fields explicitly at the top level
                    status: status,
                    // Use normalized boolean value
                    answer: isApproved ? "true" : "false"
                });
                return true;
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error in checkVerificationStatus handler:", error);
            callback?.({
                text: "I apologize, but I'm having trouble checking the verification status at the moment. Please try again later.",
                // Still include status fields even in error case
                status: "error",
                answer: null
            });
            return false;
        }
    }
};