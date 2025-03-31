import { ActionExample } from "@elizaos/core";

/**
 * Examples for GET_RAIIN_QUEST_STATUS action
 * 
 * These examples show how the agent can retrieve quest status information
 * from the Raiinmaker platform, including filtering by date, status and type.
 */
export const getQuestStatusExample: ActionExample[][] = [
    // Basic quest status request
    [
        {
            user: "{{user1}}",
            content: {
                text: "What is the status of my raiinmaker quest?"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me take a look at that quest for you.",
                action: "GET_RAIIN_QUEST_STATUS",
            },
        }
    ],
    // Simple alternative phrasing
    [
        {
            user: "{{user1}}",
            content: {
                text: "Tell me about my quest."
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check the Raiinmaker app for you.",
                action: "GET_RAIIN_QUEST_STATUS",
            },
        }
    ],
    // Request with time filter
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me my quests from this week."
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll retrieve your quests from this week.",
                action: "GET_RAIIN_QUEST_STATUS",
            },
        }
    ],
    // Request with status filter
    [
        {
            user: "{{user1}}",
            content: {
                text: "What quests do I have that are still pending?"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check your pending quests in the Raiinmaker system.",
                action: "GET_RAIIN_QUEST_STATUS",
            },
        }
    ],
    // Request with type filter
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me my boolean verification tasks."
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll look up your boolean verification tasks.",
                action: "GET_RAIIN_QUEST_STATUS",
            },
        }
    ],
    // Combined filters
    [
        {
            user: "{{user1}}",
            content: {
                text: "What completed verification tasks did I have this month?"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll find your completed verification tasks from this month.",
                action: "GET_RAIIN_QUEST_STATUS",
            },
        }
    ]
];

/**
 * Examples for GET_RAIIN_DATA_VERIFICATION action
 * 
 * These examples show how the agent can verify data through
 * the Raiinmaker validation service with various data formats.
 */
export const getDataVerificationExample: ActionExample[][] = [
    // Generic data verification
    [
        {
            user: "{{user1}}",
            content: {
                text: "Can you verify this data for me? The sky is blue."
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me verify that data for you.",
                action: "GET_RAIIN_DATA_VERIFICATION",
            },
        }
    ],
    // URL verification
    [
        {
            user: "{{user1}}",
            content: {
                text: "Is this URL valid? https://example.com/resource"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll verify that URL through the Raiinmaker service.",
                action: "GET_RAIIN_DATA_VERIFICATION",
            },
        }
    ],
    // Statement verification
    [
        {
            user: "{{user1}}",
            content: {
                text: "Can you verify if this statement is accurate? 'The Earth completes one rotation every 24 hours.'"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll validate that statement for accuracy.",
                action: "GET_RAIIN_DATA_VERIFICATION",
            },
        }
    ],
    // Data with context
    [
        {
            user: "{{user1}}",
            content: {
                text: "I need to verify this scientific claim in my article: 'Water boils at 100 degrees Celsius at sea level.'"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll verify that scientific claim through our validation service.",
                action: "GET_RAIIN_DATA_VERIFICATION",
            },
        }
    ]
];

/**
 * Examples for VERIFY_GENERATION_CONTENT action
 * 
 * These examples show how the agent can verify if content is appropriate
 * for posting through the Raiinmaker human validation system.
 */
export const verifyGenerationContentExamples: ActionExample[][] = [
    // Tweet verification with single quotes
    [
        {
            user: "{{user1}}",
            content: {
                text: "Can you verify if this tweet is appropriate? 'Just tried the new AI feature and it's incredible! #AIrevolution'"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll verify if that tweet is appropriate for posting.",
                action: "VERIFY_GENERATION_CONTENT",
            },
        }
    ],
    // Post verification with quoted content
    [
        {
            user: "{{user1}}",
            content: {
                text: "Is this a good post to share: 'Check out our latest product update that improves performance by 30%!'"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check if this content is appropriate for posting.",
                action: "VERIFY_GENERATION_CONTENT",
            },
        }
    ],
    // Content verification with direct content
    [
        {
            user: "{{user1}}",
            content: {
                text: "Please verify this content: Join our exclusive community to get insider tips and secret strategies."
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll submit this content for verification to see if it's appropriate.",
                action: "VERIFY_GENERATION_CONTENT",
            },
        }
    ],
    // Verification with specific context
    [
        {
            user: "{{user1}}",
            content: {
                text: "Is this social media post appropriate for a corporate account? 'We're excited to announce our partnership with @CompanyX to revolutionize the industry! #Partnership #Innovation'"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll have this corporate social media post verified for appropriateness.",
                action: "VERIFY_GENERATION_CONTENT",
            },
        }
    ],
    // Multiple pieces of content
    [
        {
            user: "{{user1}}",
            content: {
                text: "I have two tweets I'd like to verify. First one: 'Our new product launches tomorrow! #Excited'"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll verify the first tweet for you.",
                action: "VERIFY_GENERATION_CONTENT",
            },
        }
    ]
];

/**
 * Examples for CHECK_VERIFICATION_STATUS action
 * 
 * These examples show how the agent can check the status of content verification
 * tasks that were previously submitted.
 */
export const checkVerificationStatusExamples: ActionExample[][] = [
    // Check with explicit task ID
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's the status of my content verification with task ID abc123?"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check the status of your verification task.",
                action: "CHECK_VERIFICATION_STATUS",
            },
        }
    ],
    // Alternative phrasing with ID
    [
        {
            user: "{{user1}}",
            content: {
                text: "Has my tweet been verified yet? The task ID is xyz789."
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check if your tweet has been verified.",
                action: "CHECK_VERIFICATION_STATUS",
            },
        }
    ],
    // Check with embedded UUID format
    [
        {
            user: "{{user1}}",
            content: {
                text: "Can you check verification status for a2ba2d85-d95d-47ba-af8f-79826df2ddf1?"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check the status of that verification task for you.",
                action: "CHECK_VERIFICATION_STATUS",
            },
        }
    ],
    // Follow-up on previous verification
    [
        {
            user: "{{user1}}",
            content: {
                text: "Did that tweet I asked about earlier get approved?"
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I'll check if your previous verification task has been completed.",
                action: "CHECK_VERIFICATION_STATUS",
            },
        }
    ],
    // Status check with vote interest
    [
        {
            user: "{{user1}}",
            content: {
                text: "How many votes has my verification task received? The ID is task-123."
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check how many votes your verification task has received.",
                action: "CHECK_VERIFICATION_STATUS",
            },
        }
    ]
];


export const setupRaiinCredentialsExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "My App ID is abc123 and my API Key is xyz789"
            }
        },
        {
            user: "{{agent}}",
            content: {
                text: "Setting up your Raiinmaker credentials...",
                action: "SETUP_RAIIN_CREDENTIALS"
            }
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "My new appId is updated it is ab123cd my new API key is rmk-1hat553shhhfh"
            }
        },
        {
            user: "{{agent}}",
            content: {
                text: "Setting up your Raiinmaker credentials...",
                action: "SETUP_RAIIN_CREDENTIALS"
            }
        }
    ]
];

export const allActionExamples = {
    getQuestStatusExample,
    getDataVerificationExample,
    verifyGenerationContentExamples,
    checkVerificationStatusExamples,
    setupRaiinCredentialsExamples
};