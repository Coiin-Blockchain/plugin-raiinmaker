// src/responseFormatter.ts
export interface ActionResponse {
    success: boolean;
    message: string;
    data?: any;
    taskId?: string;
    status?: string;
    nextSteps?: string[];
  }
  
  export function formatVerificationResponse(
    success: boolean, 
    taskId?: string, 
    status?: string, 
    details?: string
  ): ActionResponse {
    const baseMessage = success 
      ? "Content verification request submitted successfully." 
      : "Failed to submit content for verification.";
    
    const message = details ? `${baseMessage} ${details}` : baseMessage;
    
    const nextSteps = success 
      ? [
          `Check the status later using: CHECK_VERIFICATION_STATUS with task ID ${taskId}`,
          "Wait for human validators to review your content",
          "Validators will determine if the content is appropriate to post"
        ]
      : ["Try again with different content", "Ensure your API credentials are correct"];
    
    return {
      success,
      message,
      taskId,
      status,
      nextSteps
    };
  }