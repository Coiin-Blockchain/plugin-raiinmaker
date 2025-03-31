import { 
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    ActionExample,
    elizaLogger
} from "@elizaos/core";

import { createRaiinmakerService } from "../services/raiinmakerService.js";
import { validateRaiinmakerConfig } from "../environment.js";
import { getQuestStatusExample } from "../examples.js";
import { Task } from "../types.js";

// Helper function to parse dates from natural language
function parseDateRange(text: string): { startDate?: string; endDate?: string } {
    // This is a simple example - you might want to use a more robust date parsing library
    const today = new Date();
    
    if (text.includes("today")) {
        return {
            startDate: today.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        };
    }
    
    if (text.includes("week")) {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return {
            startDate: lastWeek.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        };
    }
    
    if (text.includes("month")) {
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return {
            startDate: lastMonth.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        };
    }
    
    return {};
}

// Helper function to parse status from message
function parseStatus(text: string): 'completed' | 'pending' | undefined {
    text = text.toLowerCase();
    if (text.includes("complete") || text.includes("finished") || text.includes("done")) {
        return 'completed';
    }
    if (text.includes("pending") || text.includes("ongoing") || text.includes("active")) {
        return 'pending';
    }
    return undefined;
}

// Helper function to parse type from message
function parseType(text: string): 'BOOL' | 'SCALE' | 'TAG' | 'CATEGORY' | undefined {
    text = text.toLowerCase();
    if (text.includes("category")) return "CATEGORY";
    if (text.includes("scale")) return "SCALE";
    if (text.includes("bool")) return "BOOL";
    if (text.includes("tag")) return "TAG";
    return undefined;
}

export const getQuestStatus: Action = {
    name: "GET_RAIIN_QUEST_STATUS",
    similes: [
        "CHECK_QUEST_STATUS",
        "VIEW_QUEST",
        "GET_QUEST_STATUS",
        "GET_RAIIN_QUEST"
    ],
    description: "Gets the status of Raiinmaker quests and tasks with optional filtering by date, status, and type",
    examples: getQuestStatusExample as ActionExample[][],
    
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
        state?: State,
        _options?: { [key: string]: unknown; },
        callback?: HandlerCallback
    ) => {
        try {
            // Check if credentials were passed from the dispatcher
            let appId: string;
            let apiKey: string;
            
            if(_options?.credentials && 
                typeof _options.credentials === 'object' &&
                'appId' in _options.credentials &&
                'apiKey' in _options.credentials &&
                typeof _options.credentials.appId === 'string' &&
                typeof _options.credentials.apiKey === 'string'
            ) {
                // Use credentials passed from dispatcher
                appId = _options.credentials.appId;
                apiKey = _options.credentials.apiKey;
            } else {
                // Try to get global credentials
                const globalConfig = await validateRaiinmakerConfig(runtime, { allowMissing: true });
                
                if (!globalConfig) {
                    if (callback) {
                        callback({
                            text: `No Raiinmaker credentials available. Please set up credentials first.`
                        });
                    }
                    return false;
                }
                
                appId = globalConfig.RAIINMAKER_APP_ID;
                apiKey = globalConfig.RAIINMAKER_API_KEY;
            }
            
            // Create the service with appropriate credentials
            const raiinService = createRaiinmakerService(apiKey, appId);
            
            // Parse message content for filters
            const messageText = message.content.text.toLowerCase();
            const dateRange = parseDateRange(messageText);
            const status = parseStatus(messageText);
            const type = parseType(messageText);
    
            // Get filtered tasks
            const tasks = await raiinService.getAllTasks({
                ...dateRange,
                status,
                type
            });
            
            if (tasks.data.items.length === 0) {
                callback?.({
                    text: "I couldn't find any quests matching your criteria. Would you like to see all available quests instead?"
                });
                return false;
            }
    
            // Format response with filter information
            let responseText = "Here are your Raiinmaker quests";
            if (status) responseText += ` (${status})`;
            if (type) responseText += ` of type ${type}`;
            if (dateRange.startDate) responseText += ` from ${dateRange.startDate}`;
            if (dateRange.endDate) responseText += ` to ${dateRange.endDate}`;
            responseText += ":\n\n";

            // Format each task
            const formattedTasks = tasks.data.items.map((task: Task) => ({
                name: task.name,
                status: task.status,
                type: task.type,
                question: task.question,
                answer: task.answer,
                updatedAt: new Date(task.updatedAt).toLocaleString()
            }));

            responseText += formattedTasks.map((task) => 
                `• ${task.name} (${task.status})\n` +
                `  Type: ${task.type}\n` +
                `  Question: ${task.question}\n` +
                `  ${task.answer ? `Answer: ${task.answer}\n` : ''}` +
                `  Last Updated: ${task.updatedAt}`
            ).join('\n\n');

            callback?.({ text: responseText });
            return true;
        } catch (error: unknown) {
            elizaLogger.error("Error in getQuestStatus handler:", error);
            callback?.({
                text: "I apologize, but I'm having trouble retrieving your quest status at the moment. Please try again later."
            });
            return false;
        }
    }
};