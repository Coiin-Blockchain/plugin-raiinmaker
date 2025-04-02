import { elizaLogger, IAgentRuntime } from "@elizaos/core";
import { isPreVerificationEnabled } from "../environment";

interface PreVerificationResult {
  passes: boolean;
  failedChecks: string[];
  suggestedFix?: string;
}

/**
 * Sends content to OpenAI to check against content guidelines
 * before sending to human verification
 */
export async function preVerifyContent(
  runtime: IAgentRuntime,
  content: string,
  checklistItems: string[] = DEFAULT_CHECKLIST
): Promise<PreVerificationResult> {
  try {
    // First, check if pre-verification is enabled and OpenAI API key is available
    const enabled = await isPreVerificationEnabled(runtime);
    
    if (!enabled) {
      elizaLogger.info("Content pre-verification is disabled or OpenAI API key not configured, skipping check");
      return { passes: true, failedChecks: [] };
    }
    
    // Get the API key
    const apiKey = runtime.getSetting("OPENAI_API_KEY") || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      elizaLogger.warn("OpenAI API key not found, skipping pre-verification");
      return { passes: true, failedChecks: [] };
    }
    
    // Define the prompt with clear instructions and expected format
    const prompt = `
You are a content verification assistant. Your job is to check if the content below follows all the guidelines in the checklist.
Respond in JSON format with "passes" (boolean), "failedChecks" (array of failed checks), and "suggestedFix" (string with proposed edits if any).

CONTENT TO VERIFY:
"""
${content}
"""

CHECKLIST:
${checklistItems.map((item, index) => `${index + 1}. ${item}`).join('\n')}

RESPOND ONLY WITH JSON:
`;

    // Using OpenAI API specifically for content pre-verification
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Using a smaller model for efficiency and cost savings
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Low temperature for more consistent, rule-based checking
        response_format: { type: "json_object" }
      })
    });

    const result = await response.json();
    
    // Check for API errors
    if (result.error) {
      elizaLogger.error(`OpenAI API error: ${result.error.message}`);
      throw new Error(`OpenAI API error: ${result.error.message}`);
    }
    
    // Extract the JSON response from the LLM output
    let verification: PreVerificationResult;
    
    try {
      verification = JSON.parse(result.choices[0].message.content);
    } catch (parseError) {
      elizaLogger.error("Failed to parse OpenAI response:", parseError);
      elizaLogger.debug("Raw OpenAI response:", result.choices[0].message.content);
      throw new Error("Failed to parse verification result");
    }
    
    // Environment-specific logging
    const isDev = runtime.getSetting("RAIINMAKER_ENVIRONMENT") === "development";
    if (isDev) {
      elizaLogger.debug("OpenAI verification response:", verification);
    }
    
    // Log the result
    elizaLogger.info(`Pre-verification result: ${verification.passes ? 'PASSED' : 'FAILED'}`);
    if (!verification.passes) {
      elizaLogger.info(`Failed checks: ${verification.failedChecks.join(', ')}`);
    }
    
    return verification;
    
  } catch (error) {
    elizaLogger.error("Error in content pre-verification:", error);
    // Default to passing if there's an error, so we fall back to human verification
    return { passes: true, failedChecks: [] };
  }
}

// Default checklist if none provided
const DEFAULT_CHECKLIST = [
  "Content does not contain hate speech or discriminatory language",
  "Content is appropriate for the target audience",
  "Content aligns with the agent's persona and purpose",
  "Content does not contain unsafe advice or recommendations",
  "Content follows platform guidelines for the intended social network",
  "Content is free from profanity or explicit material"
];