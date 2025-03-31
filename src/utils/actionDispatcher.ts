import { IAgentRuntime, Memory, elizaLogger } from "@elizaos/core";
import { validateRaiinmakerConfig } from "../environment";
import { ensureUUID } from "./uuidHelpers";

export async function dispatchRaiinmakerAction(
    runtime: IAgentRuntime,
    message: Memory,
    actionName: string,
    options?: any
) {
    try {
        // Check for global credentials
        const config = await validateRaiinmakerConfig(runtime, { allowMissing: true });
        
        if (!config) {
            elizaLogger.warn('No global Raiinmaker credentials found');
            return runtime.processActions(message, [{
                id: ensureUUID(`action-${Date.now()}`),
                userId: message.userId,
                agentId: runtime.agentId,
                roomId: message.roomId,
                content: {
                    text: "Raiinmaker API configuration is not properly set up.",
                    action: actionName
                },
                createdAt: Date.now()
            }]);
        }

        // Dispatch action with global credentials
        return runtime.processActions(message, [{
            id: ensureUUID(`action-${Date.now()}`),
            userId: message.userId,
            agentId: runtime.agentId,
            roomId: message.roomId,
            content: {
                text: "Processing action...",
                action: actionName,
                options
            },
            createdAt: Date.now()
        }]);
    } catch (error) {
        elizaLogger.error("Error dispatching action:", error);
        return false;
    }
}