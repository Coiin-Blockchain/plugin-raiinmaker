import { IMemoryManager } from "@elizaos/core";
import { Memory as ElizaMemory } from "@elizaos/core";

// Interface for a single task
export interface Task {
    id: string;
    orgId: string;
    appId: string;
    name: string;
    type: "CATEGORY" | "SCALE";  // Using literal types for known values
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

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
}

// Interface for the response from the getAllTasks API, a collection of tasks
export interface AllTasksResponse {
    success: boolean;
    data: PaginatedResponse<Task>;
}

// Interface for a single vote in a task
export interface Vote {
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

// Extend the Task interface to include votes for single task response
export interface TaskWithVotes extends Task {
    votes: Vote[];
}

// Interface for the response from the getTask API, a single task with votes
export interface SingleTaskResponse {
    success: boolean;
    data: TaskWithVotes;
}

export interface AgentValidationResponse {
    classification: string;
    message: string;
    date: string;
    time: string;
    url: string;
}

export interface Campaign {
    id: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE';
    verificationType: 'HUMAN' | 'AUTOMATIC';
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCampaignParams {
    name: string;
    verificationType: 'HUMAN' | 'AUTOMATIC';
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    image?: File | Blob;
}

export interface UpdateCampaignParams {
    name?: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    image?: File | Blob;
}

export interface CampaignResponse {
    success: boolean;
    data: Campaign;
}


export interface CreateTaskRequest {
    campaignId?: string;
    name: string;
    type: 'BOOL' | 'SCALE' | 'TAG' | 'CATEGORY';
    scaleMin?: number;
    scaleMax?: number;
    expiry?: number;
    poolId?: string;
    humanRequired: boolean;
    consensusVotes: number;
    reputation: string;
    question: string;
    subject: string;
    base64Image?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export interface CreateTaskResponse {
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
        reputation: any;
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
    }
}

// Add UUID template type
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Update Memory interface to extend ElizaMemory instead of IMemoryManager
export interface Memory extends ElizaMemory {
    content: {
        text: string;
        metadata?: {
            taskId?: string;
            type?: string;
            raiinmakerAppId?: string;
            raiinmakerApiKey?: string;
            [key: string]: unknown;
        };
    };
    roomId: UUID;
    userId: UUID;
    agentId: UUID;
    timestamp: number;
}