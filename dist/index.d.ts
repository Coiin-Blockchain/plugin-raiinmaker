import { IAgentRuntime, Plugin } from '@elizaos/core';
import { z } from 'zod';

interface Task {
    id: string;
    orgId: string;
    appId: string;
    name: string;
    type: "CATEGORY" | "SCALE";
    status: "completed" | "pending";
    categories: string[];
    scaleMin: number | null;
    scaleMax: number | null;
    expiry: null | string;
    poolId: null | string;
    humanRequired: boolean;
    consensusVotes: number;
    reputation: string;
    question: string;
    subject: string;
    imageUrl: string | null;
    answer: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: null | string;
    metadata: null | any;
}
interface PaginatedResponse<T> {
    items: T[];
    total: number;
}
interface AllTasksResponse {
    success: boolean;
    data: PaginatedResponse<Task>;
}
interface Vote {
    id: string;
    answer: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: null | string;
    taskId: string;
    userId: string;
    reputationScore: number;
    reputationRating: string;
    reputationPercentile: number;
    metadata: null | any;
}
interface TaskWithVotes extends Task {
    votes: Vote[];
}
interface SingleTaskResponse {
    success: boolean;
    data: TaskWithVotes;
}
interface AgentValidationResponse {
    classification: string;
    message: string;
    date: string;
    time: string;
    url: string;
}
interface Campaign {
    id: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE';
    verificationType: 'HUMAN' | 'AUTOMATIC';
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}
interface CreateCampaignParams {
    name: string;
    verificationType: 'HUMAN' | 'AUTOMATIC';
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    image?: File | Blob;
}
interface UpdateCampaignParams {
    name?: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    image?: File | Blob;
}
interface CampaignResponse {
    success: boolean;
    data: Campaign;
}
interface CreateTaskResponse {
    success: boolean;
    data: {
        id: string;
        orgId: any;
        appId: any;
        name: string;
        type: string;
        status: string;
        scaleMin: any;
        scaleMax: any;
        expiry: any;
        poolId: any;
        humanRequired: boolean;
        consensusVotes: number;
        reputation: string;
        question: string;
        subject: any;
        imageUrl: any;
        answer: any;
        createdAt: string;
        updatedAt: string;
        deletedAt: any;
        creditCost: number;
        metadata: any;
        campaignId: any;
    };
}

interface TaskQueryParams {
    page?: number;
    limit?: number;
    campaignId?: string;
    startDate?: string;
    endDate?: string;
    status?: 'failed' | 'pending' | 'automatic' | 'completed';
    type?: 'BOOL' | 'SCALE' | 'TAG' | 'CATEGORY';
}
interface RaiinmakerServiceConfig {
    apiKey: string;
    appId: string;
    userId?: string;
}
/**
 * Creates a Raiinmaker service instance with specified credentials
 * Accepts either individual parameters or a config object with userId
 */
declare const createRaiinmakerService: (configOrApiKey: RaiinmakerServiceConfig | string, appId?: string) => {
    getAllTasks: (params?: TaskQueryParams) => Promise<AllTasksResponse>;
    getTaskById: (taskId: string) => Promise<SingleTaskResponse>;
    getDataVerification: (validationData: string) => Promise<AgentValidationResponse>;
    createCampaign: (params: CreateCampaignParams) => Promise<CampaignResponse>;
    updateCampaign: (campaignId: string, params: UpdateCampaignParams) => Promise<CampaignResponse>;
    getCampaign: (campaignId: string) => Promise<CampaignResponse>;
    createGenerationVerificationTask: (content: string, options?: {
        campaignId?: string;
        name?: string;
        consensusVotes?: number;
        question?: string;
    }) => Promise<CreateTaskResponse>;
};

declare const raiinmakerEnvironment: z.ZodObject<{
    RAIINMAKER_APP_ID: z.ZodString;
    RAIINMAKER_API_KEY: z.ZodString;
    RAIINMAKER_ENVIRONMENT: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
    ENABLE_PRE_VERIFICATION: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    RAIINMAKER_APP_ID: string;
    RAIINMAKER_API_KEY: string;
    RAIINMAKER_ENVIRONMENT: "development" | "staging" | "production";
    ENABLE_PRE_VERIFICATION: boolean;
    OPENAI_API_KEY?: string | undefined;
}, {
    RAIINMAKER_APP_ID: string;
    RAIINMAKER_API_KEY: string;
    RAIINMAKER_ENVIRONMENT?: "development" | "staging" | "production" | undefined;
    OPENAI_API_KEY?: string | undefined;
    ENABLE_PRE_VERIFICATION?: boolean | undefined;
}>;
type raiinmakerConfig = z.infer<typeof raiinmakerEnvironment>;
declare function validateRaiinmakerConfig(runtime: IAgentRuntime, options?: {
    allowMissing?: boolean;
    silent?: boolean;
}): Promise<raiinmakerConfig>;
declare function isDevelopmentEnvironment(runtime: IAgentRuntime): Promise<boolean>;
declare function isActionAllowedInEnvironment(runtime: IAgentRuntime, actionName: string, options?: {
    developmentOnly?: boolean;
    allowedEnvironments?: string[];
}): Promise<boolean>;
declare function isPreVerificationEnabled(runtime: IAgentRuntime): Promise<boolean>;

interface PreVerificationResult {
    passes: boolean;
    failedChecks: string[];
    suggestedFix?: string;
}
/**
 * Sends content to OpenAI to check against content guidelines
 * before sending to human verification
 */
declare function preVerifyContent(runtime: IAgentRuntime, content: string, checklistItems?: string[]): Promise<PreVerificationResult>;

/**
 * A clean response object for verification status checks
 */
interface VerificationStatusResponse {
    taskId: string;
    status: string;
    answer: boolean | null;
    question: string;
    subject: string;
    votesReceived: number;
    votesRequired: number;
    votesYes?: number;
    votesNo?: number;
    formattedText?: string;
}
/**
 * Formats a task status response with sanitized output for both
 * machine parsing and human reading
 */
declare function formatVerificationStatusResponse(task: TaskWithVotes): VerificationStatusResponse;

declare const raiinmakerPlugin: Plugin;

export { createRaiinmakerService, raiinmakerPlugin as default, formatVerificationStatusResponse, isActionAllowedInEnvironment, isDevelopmentEnvironment, isPreVerificationEnabled, preVerifyContent, raiinmakerPlugin, validateRaiinmakerConfig };
