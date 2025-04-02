import { Plugin } from "@elizaos/core";
import { getQuestStatus } from "./actions/getQuestStatus";
import { getDataVerification } from "./actions/getDataVerification";
import { verifyGenerationContent } from "./actions/verifyGenerationContent";
import { checkVerificationStatus } from "./actions/checkVerificationStatus";
import { createRaiinmakerService } from "./services/raiinmakerService";
import { 
    validateRaiinmakerConfig, 
    isDevelopmentEnvironment, 
    isActionAllowedInEnvironment,
    isPreVerificationEnabled 
} from "./environment";
import { preVerifyContent } from "./services/contentPreVerificationService";
import { formatVerificationStatusResponse } from "./utils/responseFormatter";

export const raiinmakerPlugin: Plugin = {
    name: "raiinmaker",
    description: "Plugin for ElizaOS to integrate with the Raiinmaker app for content verification and validation",
    actions: [
        getQuestStatus,
        getDataVerification,
        verifyGenerationContent,
        checkVerificationStatus
    ],
    evaluators: [],
    providers: [],
};

// Export additional functions for use by other plugins or components
export { 
    createRaiinmakerService, 
    validateRaiinmakerConfig,
    preVerifyContent,
    isDevelopmentEnvironment,
    isActionAllowedInEnvironment,
    isPreVerificationEnabled,
    formatVerificationStatusResponse
};

export default raiinmakerPlugin;