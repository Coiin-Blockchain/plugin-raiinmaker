// src/utils/responseFormatter.ts
import { elizaLogger } from "@elizaos/core";
import { TaskWithVotes } from '../types';

/**
 * A clean response object for verification status checks
 */
export interface VerificationStatusResponse {
  taskId: string;
  status: string;
  answer: boolean | null;
  question: string;
  subject: string;
  votesReceived: number;
  votesRequired: number;
  votesYes?: number;
  votesNo?: number;
  formattedText?: string; // Optional human-readable version
}

/**
 * Formats a task status response with sanitized output for both
 * machine parsing and human reading
 */
export function formatVerificationStatusResponse(task: TaskWithVotes): VerificationStatusResponse {
  try {
    // Extract core data with defaults for safety
    const id = task.id || "";
    const status = task.status || "unknown";
    const question = task.question || "";
    const subject = task.subject || "";
    
    // Parse the answer value safely
    let parsedAnswer: boolean | null = null;
    if (task.answer === 'true' || task.answer === 'yes' || task.answer === '1') {
      parsedAnswer = true;
    } else if (task.answer === 'false' || task.answer === 'no' || task.answer === '0') {
      parsedAnswer = false;
    }
    
    // Calculate vote statistics
    const votes = task.votes || [];
    const consensusVotes = task.consensusVotes || 0;
    const yesVotes = votes.filter(v => v.answer === 'true').length;
    const noVotes = votes.filter(v => v.answer === 'false').length;
    
    // Create simplified ID for display (first 8 chars)
    const shortId = id.length > 8 ? `${id.substring(0, 8)}...` : id;
    
    // Create a status emoji for human-readable format
    let statusEmoji = '⏳';
    if (status === 'completed') {
      statusEmoji = parsedAnswer === true ? '✅' : '❌';
    }
    
    // Build a human-readable formatted text (without excessive newlines)
    let statusText = '';
    if (status === 'completed') {
      statusText = `The verification is complete. The content was ${parsedAnswer ? 'approved' : 'rejected'}.`;
    } else if (status === 'pending') {
      statusText = `The verification is still in progress. ${votes.length} of ${consensusVotes} required votes collected.`;
    } else {
      statusText = `Status: ${status}`;
    }
    
    // Construct a clean, well-formatted string for human consumption
    const formattedText = `${statusEmoji} Content Verification (ID: ${shortId}) - ${statusText}`;
    
    // Return a clean, structured response object
    return {
      taskId: id,
      status,
      answer: parsedAnswer,
      question,
      subject,
      votesReceived: votes.length,
      votesRequired: consensusVotes,
      votesYes: yesVotes,
      votesNo: noVotes,
      formattedText
    };
  } catch (error) {
    elizaLogger.error("Error formatting verification response:", error);
    
    // Return a minimal response in case of error
    return {
      taskId: task.id || "unknown",
      status: "error",
      answer: null,
      question: "",
      subject: "",
      votesReceived: 0,
      votesRequired: 0,
      formattedText: "Error formatting verification response"
    };
  }
}