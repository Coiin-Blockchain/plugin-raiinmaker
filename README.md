# Eliza Raiinmaker Plugin

A plugin for the Eliza AI agent framework that integrates with the Raiinmaker content verification API, enabling AI agents to have their content reviewed by human validators before posting.

## Features

- **Content Verification**: Submit content (tweets, posts, messages) to be verified by human validators
- **Verification Status Checking**: Track and check the status of ongoing verification requests
- **Quest Status**: View the status of Raiinmaker quests and tasks with filtering options
- **Data Verification**: Verify data through the Raiinmaker validation service

## Installation

Go to `eliza/agent/package.json` and in `dependencies` add:
```
  "@elizaos-plugins/plugin-raiinmaker": "github:Coiin-Blockchain/plugin-raiinmaker",
```

## Configuration

Configure in your character's file:

```
import pluginRaiinmaker from "@elizaos-plugins/plugin-raiinmaker";
import twitterPlugin from "@elizaos-plugins/client-twitter";
xport const defaultCharacter: Character = {
  plugins: [
          twitterPlugin,
          pluginRaiinmaker,
      ],
  "name": "MyAgent"
}
```

## Available Actions

### VERIFY_GENERATION_CONTENT

Submits content to be verified by human validators in the Raiinmaker network.

Example:
```
User: Can you verify if this tweet is appropriate? "Just tried the new AI feature and it's incredible! #AIrevolution"
Agent: I'll verify if that tweet is appropriate for posting.
```

### CHECK_VERIFICATION_STATUS

Checks the status of a verification task.

Example:
```
User: What's the status of my content verification with task ID abc123?
Agent: Let me check the status of your verification task.
```

### GET_RAIIN_QUEST_STATUS

Gets the status of Raiinmaker quests and tasks with optional filtering.

Example:
```
User: What is the status of my raiinmaker quest?
Agent: Let me take a look at that quest for you.
```

### GET_RAIIN_DATA_VERIFICATION

Verifies data through the Raiinmaker validation service.

Example:
```
User: Can you verify this data for me? The sky is blue.
Agent: Let me verify that data for you.
```

## Integration With Twitter Client

This plugin works especially well with the Twitter client to verify content before posting:

First, allow enable our plugin approval in your .env file:
```

RAIINMAKER_API_KEY=               # Required, API Key from seed panel
RAIINMAKER_APP_ID=                # Required, App ID from seed panel
RAIINMAKER_ENVIRONMENT=           # Options: development, staging, production
RAIINMAKER_API_URL='https://server.api.raiinmaker.com/external'
TWITTER_APPROVAL_ENABLED=false    # Optional, Default: false
TWITTER_APPROVAL_CHECK_INTERVAL=60 # Optional, Default: 60
TWITTER_APPROVAL_PROVIDER=RAIINMAKER # RAIINMAKER or DISCORD, Default: RAIINMAKER
OPENAI_API_KEY =                  # OpenAi API key for pre-verification step

```
* Get your AppId and API key on the [raiinmaker seed panel](https://seed.raiinmaker.com/)
* To preform pre-verification, you must have an OpenAI api Key

Then, in your `/packages/client-twitter/post.ts`
```typescript
// In your Twitter post generation flow
if (approvalRequired) {
    // Send for Raiinmaker verification
    const taskId = await sendForRaiinmakerVerification(
        tweetTextForPosting,
        roomId,
        rawTweetContent
    );
    elizaLogger.log("Tweet sent for Raiinmaker verification");
} else {
    // Post directly
    this.postTweet(...);
}
```

## Development

### Building the Plugin

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test tests/verificationFlow.test.ts
```

## License

MIT# Updated repository URL
