
/**
 * Extracts content to verify from a message
 * Uses various strategies to identify the content to be verified
 */
export function extractVerifiableContent(messageText: string): string {
    // Try extracting quoted content first (most reliable)
    const quotedSingleContent = messageText.match(/'([^']+)'/);
    const quotedDoubleContent = messageText.match(/"([^"]+)"/);
    
    if (quotedSingleContent && quotedSingleContent[1]) {
      return quotedSingleContent[1];
    }
    
    if (quotedDoubleContent && quotedDoubleContent[1]) {
      return quotedDoubleContent[1];
    }
    
    // Try to find content after common phrases
    const commonPhrasePatterns = [
      /(?:verify|check|validate|is\s+this\s+(?:appropriate|good))(?:\s*this)?(?:\s*content|tweet|post)?[:\s-]+(.+)$/i,
      /(?:is\s+this\s+(?:appropriate|good))[:\s-]+(.+)$/i,
      /(?:content|tweet|post)[:\s-]+["']?([^"']+)["']?$/i
    ];
    
    for (const pattern of commonPhrasePatterns) {
      const match = messageText.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim();
      }
    }
    
    // If all strategies fail, use the full message but remove verification request phrases
    const cleanedMessage = messageText
      .replace(/(?:can you |please |could you )?(?:verify|check|validate|is this good|is this appropriate)(?:\s+if|\s+whether)?\s*/i, '')
      .replace(/(?:this |the |following |content |tweet |post |message )+/i, '')
      .trim();
    
    return cleanedMessage;
  }