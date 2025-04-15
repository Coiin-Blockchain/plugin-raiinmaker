import { AgentValidationResponse } from '../types';


const BASE_URL = process.env.RAIINMAKER_API_URL || "https://server-staging.api.raiinmaker.com/external";

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
        // Construct the API endpoint for data verification
        const url = `${BASE_URL}/validate`;

        // Prepare the request body
        const requestBody = {
            content: data,
            // Add any additional parameters required by the API
            type: "text"  // Assuming API supports text validation
        };

        // Make the API call
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'appId': appId,
                'appSecret': apiKey
            },
            body: JSON.stringify(requestBody)
        });

        // Handle unsuccessful responses
        if (!response.ok) {
            // If we haven't exceeded retry attempts, try again
            if (attempts < maxAttempts) {
                // Exponential backoff for retries
                const delay = Math.pow(2, attempts) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return getAgentValidation(apiKey, appId, data, attempts + 1, maxAttempts);
            }
            
            const errorText = await response.text();
            try {
                const error = JSON.parse(errorText);
                throw new Error(error?.message || response.statusText);
            } catch (e) {
                throw new Error(`Data validation failed: ${errorText}`);
            }
        }

        // Parse the successful response
        const result = await response.json();
        
        // Transform the API response to match our expected format
        return {
            classification: result.classification || result.status || "unknown",
            message: result.message || result.details || "No detailed message provided",
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            url: result.referenceUrl || "https://seed.raiinmaker.com"
        };
    } catch (error) {
        console.error("Error during data verification:", error);
        
        // If we haven't exceeded retry attempts and it's a network error, try again
        if (attempts < maxAttempts && error instanceof TypeError) {
            const delay = Math.pow(2, attempts) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return getAgentValidation(apiKey, appId, data, attempts + 1);
        }
        
        throw error;
    }
}