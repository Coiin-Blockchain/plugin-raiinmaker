// src/services/raiinmakerService.ts
import {
    Task,
    AllTasksResponse,
    AgentValidationResponse,
    SingleTaskResponse,
    Vote,
    TaskWithVotes,
    CampaignResponse,
    CreateCampaignParams,
    UpdateCampaignParams,
    CreateTaskRequest,
    CreateTaskResponse
} from "../types.js";
import { elizaLogger } from "@elizaos/core";

// Custom error class for Raiinmaker API errors
export class RaiinmakerApiError extends Error {
    status?: number;
    endpoint?: string;
    details?: any;

    constructor(message: string, options?: { status?: number; endpoint?: string; details?: any }) {
        super(message);
        this.name = 'RaiinmakerApiError';
        this.status = options?.status;
        this.endpoint = options?.endpoint;
        this.details = options?.details;
    }
}

// Base URL with environment awareness
const BASE_URL = process.env.RAIINMAKER_API_URL || "https://server-staging.api.raiinmaker.com/external";

interface TaskQueryParams {
    page?: number;
    limit?: number;
    campaignId?: string;
    startDate?: string;
    endDate?: string;
    status?: 'failed' | 'pending' | 'automatic' | 'completed';
    type?: 'BOOL' | 'SCALE' | 'TAG' | 'CATEGORY';
}

// Interface for service configuration - add userId for user-specific tracking
export interface RaiinmakerServiceConfig {
    apiKey: string;
    appId: string;
    userId?: string; // Optional user ID for tracking
}

// Utility function to validate auth credentials 
function validateAuth(apiKey: string, appId: string): void {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new RaiinmakerApiError("API key is required and must be a string");
    }
    if (!appId || typeof appId !== 'string') {
        throw new RaiinmakerApiError("App ID is required and must be a string");
    }
}

// Utility to handle API responses
async function handleApiResponse(response: Response, endpoint: string): Promise<any> {
    if (!response.ok) {
        let errorMessage = `API error: ${response.status} ${response.statusText}`;
        let errorDetails = null;
        
        try {
            const errorJson = await response.json();
            errorMessage = errorJson?.message || errorMessage;
            errorDetails = errorJson;
        } catch (parseError) {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
        }
        
        throw new RaiinmakerApiError(errorMessage, {
            status: response.status,
            endpoint,
            details: errorDetails
        });
    }
    
    try {
        return await response.json();
    } catch (error) {
        throw new RaiinmakerApiError(`Failed to parse JSON response from ${endpoint}`, {
            endpoint,
            details: error
        });
    }
}

/**
 * Creates a Raiinmaker service instance with specified credentials
 * Accepts either individual parameters or a config object with userId
 */
export const createRaiinmakerService = (configOrApiKey: RaiinmakerServiceConfig | string, appId?: string) => {
    // Handle both the config object and traditional parameter style
    let apiKey: string;
    let userConfig: RaiinmakerServiceConfig;
    
    if (typeof configOrApiKey === 'string') {
        // Traditional usage pattern
        if (!appId) {
            throw new RaiinmakerApiError("Both API key and App ID are required");
        }
        
        apiKey = configOrApiKey;
        userConfig = {
            apiKey,
            appId
        };
    } else {
        // Config object pattern
        userConfig = configOrApiKey;
        apiKey = userConfig.apiKey;
        appId = userConfig.appId;
    }
    
    // Validate credentials
    validateAuth(apiKey, appId);
    
    // Use a consistent base headers object
    const baseHeaders = {
        'accept': 'application/json',
        'appId': appId,
        'appSecret': apiKey
    };

    // Log creation with user context if available
    const logPrefix = userConfig.userId ? `[User: ${userConfig.userId.substring(0, 8)}...]` : '';
    elizaLogger.info(`${logPrefix} Creating Raiinmaker service with appId: ${appId.substring(0, 4)}...`);

    /**
     * Retrieves a list of tasks with optional filtering parameters
     */
    const getAllTasks = async (params: TaskQueryParams = {}): Promise<AllTasksResponse> => {
        try {
            // Build URL with query parameters
            let url = `${BASE_URL}/task`;
            const queryParams = new URLSearchParams();
    
            // Set default values that meet API requirements, but allow override if valid
            const page = params.page !== undefined ? params.page : 0;
            const limit = params.limit !== undefined && params.limit >= 10 ? params.limit : 10;
            
            // Add parameters to query string
            queryParams.append('page', page.toString());
            queryParams.append('limit', limit.toString());
            
            // Add other optional parameters
            if (params.campaignId) queryParams.append('campaignId', params.campaignId);
            if (params.startDate) queryParams.append('startDate', params.startDate);
            if (params.endDate) queryParams.append('endDate', params.endDate);
            if (params.status) queryParams.append('status', params.status);
            if (params.type) queryParams.append('type', params.type);
    
            // Append query parameters to URL
            url += `?${queryParams.toString()}`;
    
            elizaLogger.info(`${logPrefix} Fetching tasks from ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: baseHeaders
            });
            
            const rawData = await handleApiResponse(response, 'getAllTasks');
            
            // Validate response structure
            if (typeof rawData.success !== 'boolean' || !rawData.data || !Array.isArray(rawData.data.items)) {
                throw new RaiinmakerApiError('Invalid response format from API', {
                    endpoint: 'getAllTasks',
                    details: rawData
                });
            }
    
            // Return properly validated and typed response
            const validatedResponse: AllTasksResponse = {
                success: rawData.success,
                data: {
                    items: rawData.data.items,
                    total: rawData.data.total
                }
            };
    
            return validatedResponse;
        } catch (error) {
            // Enhance error with context if it's not already a RaiinmakerApiError
            if (!(error instanceof RaiinmakerApiError)) {
                const err = error as Error;
                throw new RaiinmakerApiError(`${logPrefix} Error getting tasks: ${err.message}`, {
                    endpoint: 'getAllTasks',
                    details: error
                });
            }
            throw error;
        }
    };

    /**
     * Gets a single task by ID with votes
     */
    const getTaskById = async (taskId: string): Promise<SingleTaskResponse> => {
        if (!taskId) {
            throw new RaiinmakerApiError('Task ID is required');
        }
        
        try {
            const url = `${BASE_URL}/task/${taskId}`;
            elizaLogger.info(`${logPrefix} Fetching task with ID: ${taskId}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: baseHeaders
            });
            
            const rawData = await handleApiResponse(response, 'getTaskById');
            
            // Perform minimal validation on critical fields
            if (typeof rawData.success !== 'boolean' || !rawData.data || !rawData.data.id) {
                throw new RaiinmakerApiError('Invalid task data returned from API', {
                    endpoint: 'getTaskById',
                    details: rawData
                });
            }
            
            // Ensure votes is always an array even if missing in response
            if (!Array.isArray(rawData.data.votes)) {
                rawData.data.votes = [];
            }
            
            return {
                success: rawData.success,
                data: rawData.data as TaskWithVotes
            };
        } catch (error) {
            if (!(error instanceof RaiinmakerApiError)) {
                const err = error as Error;
                throw new RaiinmakerApiError(`${logPrefix} Error getting task by ID: ${err.message}`, {
                    endpoint: 'getTaskById',
                    details: { taskId, error }
                });
            }
            throw error;
        }
    };

    /**
     * Verifies data through the agent validation API
     */
    const getDataVerification = async (validationData: string): Promise<AgentValidationResponse> => {
        if (!validationData) {
            throw new RaiinmakerApiError('Validation data is required');
        }
        
        try {
            const data = await getAgentValidation(apiKey, appId, validationData);
            return data;
        } catch (error) {
            if (!(error instanceof RaiinmakerApiError)) {
                const err = error as Error;
                throw new RaiinmakerApiError(`${logPrefix} Error getting agent validation: ${err.message}`, {
                    endpoint: 'getDataVerification',
                    details: error
                });
            }
            throw error;
        }
    };

    /**
     * Creates a FormData object from parameters
     */
    const createFormData = (params: Record<string, any>) => {
        const formData = new FormData();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                if (value instanceof Blob || value instanceof File) {
                    formData.append(key, value, 'image.jpg');
                } else {
                    formData.append(key, value.toString());
                }
            }
        });
        return formData;
    };
    
    /**
     * Creates a new campaign
     */
    const createCampaign = async (params: CreateCampaignParams): Promise<CampaignResponse> => {
        if (!params || !params.name || !params.verificationType) {
            throw new RaiinmakerApiError('Campaign name and verificationType are required');
        }
        
        try {
            elizaLogger.info(`${logPrefix} Creating campaign: ${params.name}`);
            
            // Create FormData manually to ensure correct structure
            const formData = new FormData();
            formData.append('name', params.name);
            formData.append('verificationType', params.verificationType);
            
            if (params.description) {
                formData.append('description', params.description);
            }
            
            if (params.status) {
                formData.append('status', params.status);
            }
    
            // Create a default image if none provided
            if (!params.image) {
                // Create a small transparent PNG as placeholder
                const transparentPixel = new Uint8Array([
                    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
                    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
                    0x54, 0x78, 0x9C, 0x63, 0x00, 0x00, 0x00, 0x02,
                    0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00,
                    0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42,
                    0x60, 0x82
                ]);
                const defaultImage = new Blob([transparentPixel], { type: 'image/png' });
                formData.append('image', defaultImage, 'placeholder.png');
            } else {
                formData.append('image', params.image, 'image.jpg');
            }
    
            const response = await fetch(`${BASE_URL}/campaigns`, {
                method: 'POST',
                headers: {
                    ...baseHeaders,
                    // Note: Content-Type is automatically set by fetch when using FormData
                },
                body: formData
            });
            
            const result = await handleApiResponse(response, 'createCampaign');
            return result as CampaignResponse;
        } catch (error) {
            if (!(error instanceof RaiinmakerApiError)) {
                const err = error as Error;
                throw new RaiinmakerApiError(`${logPrefix} Error creating campaign: ${err.message}`, {
                    endpoint: 'createCampaign',
                    details: error
                });
            }
            throw error;
        }
    };
    
    /**
     * Updates an existing campaign
     */
    const updateCampaign = async (campaignId: string, params: UpdateCampaignParams): Promise<CampaignResponse> => {
        if (!campaignId) {
            throw new RaiinmakerApiError('Campaign ID is required');
        }
        
        try {
            elizaLogger.info(`${logPrefix} Updating campaign: ${campaignId}`);
            const formData = createFormData(params);
    
            const response = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
                method: 'PUT',
                headers: {
                    ...baseHeaders,
                    // Content-Type is set automatically for FormData
                },
                body: formData
            });
            
            const result = await handleApiResponse(response, 'updateCampaign');
            return result as CampaignResponse;
        } catch (error) {
            if (!(error instanceof RaiinmakerApiError)) {
                const err = error as Error;
                throw new RaiinmakerApiError(`${logPrefix} Error updating campaign: ${err.message}`, {
                    endpoint: 'updateCampaign',
                    details: { campaignId, error }
                });
            }
            throw error;
        }
    };
    
    /**
     * Gets a campaign by ID
     */
    const getCampaign = async (campaignId: string): Promise<CampaignResponse> => {
        if (!campaignId) {
            throw new RaiinmakerApiError('Campaign ID is required');
        }
        
        try {
            elizaLogger.info(`${logPrefix} Fetching campaign: ${campaignId}`);
            
            const response = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
                method: 'GET',
                headers: baseHeaders
            });
            
            const result = await handleApiResponse(response, 'getCampaign');
            return result as CampaignResponse;
        } catch (error) {
            if (!(error instanceof RaiinmakerApiError)) {
                const err = error as Error;
                throw new RaiinmakerApiError(`${logPrefix} Error getting campaign: ${err.message}`, {
                    endpoint: 'getCampaign',
                    details: { campaignId, error }
                });
            }
            throw error;
        }
    };
    
    /**
     * Creates a task to ask users if the content is appropriate for an AI agent to post
     */
    const createGenerationVerificationTask = async (content: string, options: {
        campaignId?: string;
        name?: string;
        consensusVotes?: number;
        question?: string;
    } = {}): Promise<CreateTaskResponse> => {
        if (!content) {
            throw new RaiinmakerApiError('Content to verify is required');
        }
        
        try {
            elizaLogger.info(`${logPrefix} Creating verification task for content: ${content.substring(0, 50)}...`);
            
            // Define the task data with reasonable defaults
            const taskData: {
                name: string;
                type: string;
                humanRequired: boolean;
                consensusVotes: number;
                reputation: string;
                question: string;
                subject: string;
                campaignId?: string;
            } = {
                name: options.name || "Content Verification Task",
                type: "BOOL",  // Boolean verification is most appropriate for content approval
                humanRequired: true,
                consensusVotes: options.consensusVotes || 3,
                reputation: "ANY",  // Allow any validator to participate
                question: options.question || "Is this content appropriate for an AI agent to post?",
                subject: content  // The content to verify
            };
            
            // Add campaignId if it exists
            if (options.campaignId) {
                taskData.campaignId = options.campaignId;
            }
    
            elizaLogger.debug(`${logPrefix} Sending verification task to Raiinmaker API:`, JSON.stringify(taskData, null, 2));
    
            // Make the API request with detailed error handling
            try {
                const response = await fetch(`${BASE_URL}/task`, {
                    method: 'POST',
                    headers: {
                        ...baseHeaders,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(taskData)
                });
                
                // Log the status code for debugging
                elizaLogger.debug(`${logPrefix} Raiinmaker API response status: ${response.status} ${response.statusText}`);
                
                // Get the response body as text first for debugging
                const responseText = await response.text();
                elizaLogger.debug(`${logPrefix} Raiinmaker API response body: ${responseText}`);
                
                // Parse the response if possible
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                } catch (parseError) {
                    throw new RaiinmakerApiError(`Failed to parse API response: ${responseText}`, {
                        endpoint: 'createGenerationVerificationTask',
                        details: parseError
                    });
                }
                
                // Handle unsuccessful responses
                if (!response.ok) {
                    throw new RaiinmakerApiError(`Task creation failed with status ${response.status}: ${JSON.stringify(responseData)}`, {
                        status: response.status,
                        endpoint: 'createGenerationVerificationTask',
                        details: responseData
                    });
                }
                
                // Validate the response structure
                if (!responseData.success || !responseData.data || !responseData.data.id) {
                    throw new RaiinmakerApiError(`Invalid response format: ${JSON.stringify(responseData)}`, {
                        endpoint: 'createGenerationVerificationTask',
                        details: responseData
                    });
                }
                
                elizaLogger.success(`${logPrefix} Successfully created verification task with ID: ${responseData.data.id}`);
                return responseData as CreateTaskResponse;
                
            } catch (error) {
                if (error instanceof RaiinmakerApiError) {
                    throw error;
                }
                
                // Handle network or other errors
                const err = error as Error;
                throw new RaiinmakerApiError(`API request failed: ${err.message}`, {
                    endpoint: 'createGenerationVerificationTask',
                    details: error
                });
            }
        } catch (error) {
            elizaLogger.error(`${logPrefix} Error creating verification task: ${error instanceof Error ? error.message : String(error)}`);
            
            if (error instanceof RaiinmakerApiError) {
                elizaLogger.error(`${logPrefix} API details: ${JSON.stringify({
                    status: error.status,
                    endpoint: error.endpoint,
                    details: error.details
                }, null, 2)}`);
            }
            
            throw error;
        }
    };

    // Return the service functions
    return {
        getAllTasks,
        getTaskById,
        getDataVerification,
        createCampaign,
        updateCampaign,
        getCampaign,
        createGenerationVerificationTask
    };
};

/**
 * Gets agent validation data
 */
async function getAgentValidation(
    apiKey: string,
    appId: string,
    data: string,
    attempts = 0,
    maxAttempts = 5
): Promise<AgentValidationResponse> {
    if (!apiKey || !appId) {
        throw new Error("API key and App ID are required");
    }

    try {
        // Use the correct endpoint
        const url = `${BASE_URL}/validate`;

        // Log the request for debugging
        elizaLogger.debug(`Validating data with Raiinmaker API: ${url}`);

        // Make the API call
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'appId': appId,
                'appSecret': apiKey
            },
            body: JSON.stringify({
                content: data,
                type: "text"
            })
        });

        // Check if the response is successful
        if (!response.ok) {
            const responseText = await response.text();
            elizaLogger.error(`Error response: ${responseText}`);
            
            // Retry logic
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
                return getAgentValidation(apiKey, appId, data, attempts + 1, maxAttempts);
            }
            
            throw new Error(`Request failed with status ${response.status}: ${responseText}`);
        }

        // Parse the successful response
        const result = await response.json();
        elizaLogger.debug("Validation response:", result);
        
        // Return a properly formatted response
        return {
            classification: result.classification || "unknown",
            message: result.message || "No message provided",
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            url: "https://seed.raiinmaker.com"
        };
    } catch (error) {
        elizaLogger.error("Error during data verification:", error);
        throw error;
    }
}