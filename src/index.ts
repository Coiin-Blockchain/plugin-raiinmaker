import { Plugin } from "@elizaos/core";
import { getQuestStatus } from "./actions/getQuestStatus";
import { getDataVerification } from "./actions/getDataVerification";
import { verifyGenerationContent } from "./actions/verifyGenerationContent";
import { checkVerificationStatus } from "./actions/checkVerificationStatus";
import { createRaiinmakerService } from "./services/raiinmakerService";
import { validateRaiinmakerConfig } from "./environment";
export const raiinmakerPlugin: Plugin = {
    name: "raiinmaker",
    description: "Plugin for ElizaOS to integrate into the raiinmaker app",
    actions: [
        getQuestStatus,
        getDataVerification,
        verifyGenerationContent,
        checkVerificationStatus
    ],
    evaluators: [],
    providers: [],
};

export { createRaiinmakerService, validateRaiinmakerConfig };
export default raiinmakerPlugin;