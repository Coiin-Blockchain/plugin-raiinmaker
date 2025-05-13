// src/actions/getQuestStatus.ts
import {
  elizaLogger as elizaLogger3
} from "@elizaos/core";

// src/services/raiinmakerService.ts
import { elizaLogger } from "@elizaos/core";
var RaiinmakerApiError = class extends Error {
  constructor(message, options) {
    super(message);
    this.name = "RaiinmakerApiError";
    this.status = options?.status;
    this.endpoint = options?.endpoint;
    this.details = options?.details;
  }
};
var BASE_URL = process.env.RAIINMAKER_API_URL || "https://server-staging.api.raiinmaker.com/external";
function validateAuth(apiKey, appId) {
  if (!apiKey || typeof apiKey !== "string") {
    throw new RaiinmakerApiError("API key is required and must be a string");
  }
  if (!appId || typeof appId !== "string") {
    throw new RaiinmakerApiError("App ID is required and must be a string");
  }
}
async function handleApiResponse(response, endpoint) {
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
var createRaiinmakerService = (configOrApiKey, appId) => {
  let apiKey;
  let userConfig;
  if (typeof configOrApiKey === "string") {
    if (!appId) {
      throw new RaiinmakerApiError("Both API key and App ID are required");
    }
    apiKey = configOrApiKey;
    userConfig = {
      apiKey,
      appId
    };
  } else {
    userConfig = configOrApiKey;
    apiKey = userConfig.apiKey;
    appId = userConfig.appId;
  }
  validateAuth(apiKey, appId);
  const baseHeaders = {
    "accept": "application/json",
    "appId": appId,
    "appSecret": apiKey
  };
  const logPrefix = userConfig.userId ? `[User: ${userConfig.userId.substring(0, 8)}...]` : "";
  elizaLogger.info(`${logPrefix} Creating Raiinmaker service with appId: ${appId.substring(0, 4)}...`);
  const getAllTasks = async (params = {}) => {
    try {
      let url = `${BASE_URL}/task`;
      const queryParams = new URLSearchParams();
      const page = params.page !== void 0 ? params.page : 0;
      const limit = params.limit !== void 0 && params.limit >= 10 ? params.limit : 10;
      queryParams.append("page", page.toString());
      queryParams.append("limit", limit.toString());
      if (params.campaignId) queryParams.append("campaignId", params.campaignId);
      if (params.startDate) queryParams.append("startDate", params.startDate);
      if (params.endDate) queryParams.append("endDate", params.endDate);
      if (params.status) queryParams.append("status", params.status);
      if (params.type) queryParams.append("type", params.type);
      url += `?${queryParams.toString()}`;
      elizaLogger.info(`${logPrefix} Fetching tasks from ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers: baseHeaders
      });
      const rawData = await handleApiResponse(response, "getAllTasks");
      if (typeof rawData.success !== "boolean" || !rawData.data || !Array.isArray(rawData.data.items)) {
        throw new RaiinmakerApiError("Invalid response format from API", {
          endpoint: "getAllTasks",
          details: rawData
        });
      }
      const validatedResponse = {
        success: rawData.success,
        data: {
          items: rawData.data.items,
          total: rawData.data.total
        }
      };
      return validatedResponse;
    } catch (error) {
      if (!(error instanceof RaiinmakerApiError)) {
        const err = error;
        throw new RaiinmakerApiError(`${logPrefix} Error getting tasks: ${err.message}`, {
          endpoint: "getAllTasks",
          details: error
        });
      }
      throw error;
    }
  };
  const getTaskById = async (taskId) => {
    if (!taskId) {
      throw new RaiinmakerApiError("Task ID is required");
    }
    try {
      const url = `${BASE_URL}/task/${taskId}`;
      elizaLogger.info(`${logPrefix} Fetching task with ID: ${taskId}`);
      const response = await fetch(url, {
        method: "GET",
        headers: baseHeaders
      });
      const rawData = await handleApiResponse(response, "getTaskById");
      if (typeof rawData.success !== "boolean" || !rawData.data || !rawData.data.id) {
        throw new RaiinmakerApiError("Invalid task data returned from API", {
          endpoint: "getTaskById",
          details: rawData
        });
      }
      if (!Array.isArray(rawData.data.votes)) {
        rawData.data.votes = [];
      }
      return {
        success: rawData.success,
        data: rawData.data
      };
    } catch (error) {
      if (!(error instanceof RaiinmakerApiError)) {
        const err = error;
        throw new RaiinmakerApiError(`${logPrefix} Error getting task by ID: ${err.message}`, {
          endpoint: "getTaskById",
          details: { taskId, error }
        });
      }
      throw error;
    }
  };
  const getDataVerification2 = async (validationData) => {
    if (!validationData) {
      throw new RaiinmakerApiError("Validation data is required");
    }
    try {
      const data = await getAgentValidation(apiKey, appId, validationData);
      return data;
    } catch (error) {
      if (!(error instanceof RaiinmakerApiError)) {
        const err = error;
        throw new RaiinmakerApiError(`${logPrefix} Error getting agent validation: ${err.message}`, {
          endpoint: "getDataVerification",
          details: error
        });
      }
      throw error;
    }
  };
  const createFormData = (params) => {
    const formData = new FormData();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== void 0) {
        if (value instanceof Blob || value instanceof File) {
          formData.append(key, value, "image.jpg");
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    return formData;
  };
  const createCampaign = async (params) => {
    if (!params || !params.name || !params.verificationType) {
      throw new RaiinmakerApiError("Campaign name and verificationType are required");
    }
    try {
      elizaLogger.info(`${logPrefix} Creating campaign: ${params.name}`);
      const formData = new FormData();
      formData.append("name", params.name);
      formData.append("verificationType", params.verificationType);
      if (params.description) {
        formData.append("description", params.description);
      }
      if (params.status) {
        formData.append("status", params.status);
      }
      if (!params.image) {
        const transparentPixel = new Uint8Array([
          137,
          80,
          78,
          71,
          13,
          10,
          26,
          10,
          0,
          0,
          0,
          13,
          73,
          72,
          68,
          82,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          1,
          8,
          6,
          0,
          0,
          0,
          31,
          21,
          196,
          137,
          0,
          0,
          0,
          10,
          73,
          68,
          65,
          84,
          120,
          156,
          99,
          0,
          0,
          0,
          2,
          0,
          1,
          229,
          39,
          222,
          252,
          0,
          0,
          0,
          0,
          73,
          69,
          78,
          68,
          174,
          66,
          96,
          130
        ]);
        const defaultImage = new Blob([transparentPixel], { type: "image/png" });
        formData.append("image", defaultImage, "placeholder.png");
      } else {
        formData.append("image", params.image, "image.jpg");
      }
      const response = await fetch(`${BASE_URL}/campaigns`, {
        method: "POST",
        headers: {
          ...baseHeaders
          // Note: Content-Type is automatically set by fetch when using FormData
        },
        body: formData
      });
      const result = await handleApiResponse(response, "createCampaign");
      return result;
    } catch (error) {
      if (!(error instanceof RaiinmakerApiError)) {
        const err = error;
        throw new RaiinmakerApiError(`${logPrefix} Error creating campaign: ${err.message}`, {
          endpoint: "createCampaign",
          details: error
        });
      }
      throw error;
    }
  };
  const updateCampaign = async (campaignId, params) => {
    if (!campaignId) {
      throw new RaiinmakerApiError("Campaign ID is required");
    }
    try {
      elizaLogger.info(`${logPrefix} Updating campaign: ${campaignId}`);
      const formData = createFormData(params);
      const response = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
        method: "PUT",
        headers: {
          ...baseHeaders
          // Content-Type is set automatically for FormData
        },
        body: formData
      });
      const result = await handleApiResponse(response, "updateCampaign");
      return result;
    } catch (error) {
      if (!(error instanceof RaiinmakerApiError)) {
        const err = error;
        throw new RaiinmakerApiError(`${logPrefix} Error updating campaign: ${err.message}`, {
          endpoint: "updateCampaign",
          details: { campaignId, error }
        });
      }
      throw error;
    }
  };
  const getCampaign = async (campaignId) => {
    if (!campaignId) {
      throw new RaiinmakerApiError("Campaign ID is required");
    }
    try {
      elizaLogger.info(`${logPrefix} Fetching campaign: ${campaignId}`);
      const response = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
        method: "GET",
        headers: baseHeaders
      });
      const result = await handleApiResponse(response, "getCampaign");
      return result;
    } catch (error) {
      if (!(error instanceof RaiinmakerApiError)) {
        const err = error;
        throw new RaiinmakerApiError(`${logPrefix} Error getting campaign: ${err.message}`, {
          endpoint: "getCampaign",
          details: { campaignId, error }
        });
      }
      throw error;
    }
  };
  const createGenerationVerificationTask = async (content, options = {}) => {
    if (!content) {
      throw new RaiinmakerApiError("Content to verify is required");
    }
    try {
      elizaLogger.info(`${logPrefix} Creating verification task for content: ${content.substring(0, 50)}...`);
      const taskData = {
        name: options.name || "Content Verification Task",
        type: "BOOL",
        // Boolean verification is most appropriate for content approval
        humanRequired: true,
        consensusVotes: options.consensusVotes || 3,
        reputation: "NORMAL",
        // Allow any validator to participate
        question: options.question || "Is this content appropriate for an AI agent to post?",
        subject: content
        // The content to verify
      };
      if (options.campaignId) {
        taskData.campaignId = options.campaignId;
      }
      elizaLogger.debug(`${logPrefix} Sending verification task to Raiinmaker API:`, JSON.stringify(taskData, null, 2));
      try {
        const response = await fetch(`${BASE_URL}/task`, {
          method: "POST",
          headers: {
            ...baseHeaders,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(taskData)
        });
        elizaLogger.debug(`${logPrefix} Raiinmaker API response status: ${response.status} ${response.statusText}`);
        const responseText = await response.text();
        elizaLogger.debug(`${logPrefix} Raiinmaker API response body: ${responseText}`);
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          throw new RaiinmakerApiError(`Failed to parse API response: ${responseText}`, {
            endpoint: "createGenerationVerificationTask",
            details: parseError
          });
        }
        if (!response.ok) {
          throw new RaiinmakerApiError(`Task creation failed with status ${response.status}: ${JSON.stringify(responseData)}`, {
            status: response.status,
            endpoint: "createGenerationVerificationTask",
            details: responseData
          });
        }
        if (!responseData.success || !responseData.data || !responseData.data.id) {
          throw new RaiinmakerApiError(`Invalid response format: ${JSON.stringify(responseData)}`, {
            endpoint: "createGenerationVerificationTask",
            details: responseData
          });
        }
        elizaLogger.success(`${logPrefix} Successfully created verification task with ID: ${responseData.data.id}`);
        return responseData;
      } catch (error) {
        if (error instanceof RaiinmakerApiError) {
          throw error;
        }
        const err = error;
        throw new RaiinmakerApiError(`API request failed: ${err.message}`, {
          endpoint: "createGenerationVerificationTask",
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
  return {
    getAllTasks,
    getTaskById,
    getDataVerification: getDataVerification2,
    createCampaign,
    updateCampaign,
    getCampaign,
    createGenerationVerificationTask
  };
};
async function getAgentValidation(apiKey, appId, data, attempts = 0, maxAttempts = 5) {
  if (!apiKey || !appId) {
    throw new Error("API key and App ID are required");
  }
  try {
    const url = `${BASE_URL}/validate`;
    elizaLogger.debug(`Validating data with Raiinmaker API: ${url}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "appId": appId,
        "appSecret": apiKey
      },
      body: JSON.stringify({
        content: data,
        type: "text"
      })
    });
    if (!response.ok) {
      const responseText = await response.text();
      elizaLogger.error(`Error response: ${responseText}`);
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempts) * 1e3));
        return getAgentValidation(apiKey, appId, data, attempts + 1, maxAttempts);
      }
      throw new Error(`Request failed with status ${response.status}: ${responseText}`);
    }
    const result = await response.json();
    elizaLogger.debug("Validation response:", result);
    return {
      classification: result.classification || "unknown",
      message: result.message || "No message provided",
      date: (/* @__PURE__ */ new Date()).toLocaleDateString(),
      time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      url: "https://seed.raiinmaker.com"
    };
  } catch (error) {
    elizaLogger.error("Error during data verification:", error);
    throw error;
  }
}

// src/environment.ts
import { elizaLogger as elizaLogger2 } from "@elizaos/core";
import { z } from "zod";
var raiinmakerEnvironment = z.object({
  RAIINMAKER_APP_ID: z.string().min(1, "RAIINMAKER_APP_ID is required"),
  RAIINMAKER_API_KEY: z.string().min(1, "RAIINMAKER_API_KEY is required"),
  RAIINMAKER_ENVIRONMENT: z.enum(["development", "staging", "production"]).default("development"),
  OPENAI_API_KEY: z.string().optional(),
  // Optional to allow fallback to human verification
  ENABLE_PRE_VERIFICATION: z.boolean().optional().default(true)
});
async function validateRaiinmakerConfig(runtime, options = {}) {
  try {
    const config = {
      RAIINMAKER_API_KEY: runtime.getSetting("RAIINMAKER_API_KEY") || process.env.RAIINMAKER_API_KEY,
      RAIINMAKER_APP_ID: runtime.getSetting("RAIINMAKER_APP_ID") || process.env.RAIINMAKER_APP_ID,
      RAIINMAKER_ENVIRONMENT: runtime.getSetting("RAIINMAKER_ENVIRONMENT") || process.env.RAIINMAKER_ENVIRONMENT || "development",
      OPENAI_API_KEY: runtime.getSetting("OPENAI_API_KEY") || process.env.OPENAI_API_KEY,
      ENABLE_PRE_VERIFICATION: parseBoolean(runtime.getSetting("ENABLE_PRE_VERIFICATION") || process.env.ENABLE_PRE_VERIFICATION || "true")
    };
    const result = raiinmakerEnvironment.safeParse(config);
    if (!result.success) {
      const errorMessages = result.error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`
      ).join("\n");
      const errorMessage = `Raiinmaker API configuration failed:
${errorMessages}`;
      if (!options.silent) {
        elizaLogger2.error(errorMessage);
      }
      throw new Error(errorMessage);
    }
    return result.data;
  } catch (error) {
    if (!options.silent) {
      elizaLogger2.error("Error validating Raiinmaker config:", error);
    }
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`
      ).join("\n");
      throw new Error(`Raiinmaker API configuration failed:
${errorMessages}`);
    }
    throw error;
  }
}
async function isDevelopmentEnvironment(runtime) {
  try {
    const config = await validateRaiinmakerConfig(runtime, { silent: true });
    return config.RAIINMAKER_ENVIRONMENT === "development";
  } catch (error) {
    return false;
  }
}
async function isActionAllowedInEnvironment(runtime, actionName, options = {}) {
  try {
    const config = await validateRaiinmakerConfig(runtime, { silent: true });
    const currentEnv = config.RAIINMAKER_ENVIRONMENT;
    if (options.developmentOnly && currentEnv !== "development") {
      elizaLogger2.warn(`Action ${actionName} is only available in development environment`);
      return false;
    }
    if (options.allowedEnvironments && !options.allowedEnvironments.includes(currentEnv)) {
      elizaLogger2.warn(`Action ${actionName} is not available in ${currentEnv} environment`);
      return false;
    }
    return true;
  } catch (error) {
    elizaLogger2.error(`Error checking environment permissions for ${actionName}:`, error);
    return false;
  }
}
async function isPreVerificationEnabled(runtime) {
  try {
    const config = await validateRaiinmakerConfig(runtime, { silent: true });
    if (!config.OPENAI_API_KEY) {
      return false;
    }
    return config.ENABLE_PRE_VERIFICATION === true;
  } catch (error) {
    return false;
  }
}
function parseBoolean(value) {
  if (!value) return true;
  const lowercased = value.toLowerCase();
  return !["false", "0", "no", "off", "disabled"].includes(lowercased);
}

// src/examples.ts
var getQuestStatusExample = [
  // Basic quest status request
  [
    {
      user: "{{user1}}",
      content: {
        text: "What is the status of my raiinmaker quest?"
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "Let me take a look at that quest for you.",
        action: "GET_RAIIN_QUEST_STATUS"
      }
    }
  ],
  // Simple alternative phrasing
  [
    {
      user: "{{user1}}",
      content: {
        text: "Tell me about my quest."
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "Let me check the Raiinmaker app for you.",
        action: "GET_RAIIN_QUEST_STATUS"
      }
    }
  ],
  // Request with time filter
  [
    {
      user: "{{user1}}",
      content: {
        text: "Show me my quests from this week."
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "I'll retrieve your quests from this week.",
        action: "GET_RAIIN_QUEST_STATUS"
      }
    }
  ],
  // Request with status filter
  [
    {
      user: "{{user1}}",
      content: {
        text: "What quests do I have that are still pending?"
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "Let me check your pending quests in the Raiinmaker system.",
        action: "GET_RAIIN_QUEST_STATUS"
      }
    }
  ],
  // Request with type filter
  [
    {
      user: "{{user1}}",
      content: {
        text: "Show me my boolean verification tasks."
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "I'll look up your boolean verification tasks.",
        action: "GET_RAIIN_QUEST_STATUS"
      }
    }
  ],
  // Combined filters
  [
    {
      user: "{{user1}}",
      content: {
        text: "What completed verification tasks did I have this month?"
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "I'll find your completed verification tasks from this month.",
        action: "GET_RAIIN_QUEST_STATUS"
      }
    }
  ]
];
var getDataVerificationExample = [
  // Generic data verification
  [
    {
      user: "{{user1}}",
      content: {
        text: "Can you verify this data for me? The sky is blue."
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "Let me verify that data for you.",
        action: "GET_RAIIN_DATA_VERIFICATION"
      }
    }
  ],
  // URL verification
  [
    {
      user: "{{user1}}",
      content: {
        text: "Is this URL valid? https://example.com/resource"
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "I'll verify that URL through the Raiinmaker service.",
        action: "GET_RAIIN_DATA_VERIFICATION"
      }
    }
  ],
  // Statement verification
  [
    {
      user: "{{user1}}",
      content: {
        text: "Can you verify if this statement is accurate? 'The Earth completes one rotation every 24 hours.'"
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "I'll validate that statement for accuracy.",
        action: "GET_RAIIN_DATA_VERIFICATION"
      }
    }
  ],
  // Data with context
  [
    {
      user: "{{user1}}",
      content: {
        text: "I need to verify this scientific claim in my article: 'Water boils at 100 degrees Celsius at sea level.'"
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "I'll verify that scientific claim through our validation service.",
        action: "GET_RAIIN_DATA_VERIFICATION"
      }
    }
  ]
];

// src/actions/getQuestStatus.ts
function parseDateRange(text) {
  const today = /* @__PURE__ */ new Date();
  if (text.includes("today")) {
    return {
      startDate: today.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0]
    };
  }
  if (text.includes("week")) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return {
      startDate: lastWeek.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0]
    };
  }
  if (text.includes("month")) {
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return {
      startDate: lastMonth.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0]
    };
  }
  return {};
}
function parseStatus(text) {
  text = text.toLowerCase();
  if (text.includes("complete") || text.includes("finished") || text.includes("done")) {
    return "completed";
  }
  if (text.includes("pending") || text.includes("ongoing") || text.includes("active")) {
    return "pending";
  }
  return void 0;
}
function parseType(text) {
  text = text.toLowerCase();
  if (text.includes("category")) return "CATEGORY";
  if (text.includes("scale")) return "SCALE";
  if (text.includes("bool")) return "BOOL";
  if (text.includes("tag")) return "TAG";
  return void 0;
}
var getQuestStatus = {
  name: "GET_RAIIN_QUEST_STATUS",
  similes: [
    "CHECK_QUEST_STATUS",
    "VIEW_QUEST",
    "GET_QUEST_STATUS",
    "GET_RAIIN_QUEST"
  ],
  description: "Gets the status of Raiinmaker quests and tasks with optional filtering by date, status, and type",
  examples: getQuestStatusExample,
  validate: async (runtime, message) => {
    try {
      await validateRaiinmakerConfig(runtime);
      return true;
    } catch (error) {
      elizaLogger3.error("Validation failed:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    try {
      let appId;
      let apiKey;
      if (_options?.credentials && typeof _options.credentials === "object" && "appId" in _options.credentials && "apiKey" in _options.credentials && typeof _options.credentials.appId === "string" && typeof _options.credentials.apiKey === "string") {
        appId = _options.credentials.appId;
        apiKey = _options.credentials.apiKey;
      } else {
        const globalConfig = await validateRaiinmakerConfig(runtime, { allowMissing: true });
        if (!globalConfig) {
          if (callback) {
            callback({
              text: `No Raiinmaker credentials available. Please set up credentials first.`
            });
          }
          return false;
        }
        appId = globalConfig.RAIINMAKER_APP_ID;
        apiKey = globalConfig.RAIINMAKER_API_KEY;
      }
      const raiinService = createRaiinmakerService(apiKey, appId);
      const messageText = message.content.text.toLowerCase();
      const dateRange = parseDateRange(messageText);
      const status = parseStatus(messageText);
      const type = parseType(messageText);
      const tasks = await raiinService.getAllTasks({
        ...dateRange,
        status,
        type
      });
      if (tasks.data.items.length === 0) {
        callback?.({
          text: "I couldn't find any quests matching your criteria. Would you like to see all available quests instead?"
        });
        return false;
      }
      let responseText = "Here are your Raiinmaker quests";
      if (status) responseText += ` (${status})`;
      if (type) responseText += ` of type ${type}`;
      if (dateRange.startDate) responseText += ` from ${dateRange.startDate}`;
      if (dateRange.endDate) responseText += ` to ${dateRange.endDate}`;
      responseText += ":\n\n";
      const formattedTasks = tasks.data.items.map((task) => ({
        name: task.name,
        status: task.status,
        type: task.type,
        question: task.question,
        answer: task.answer,
        updatedAt: new Date(task.updatedAt).toLocaleString()
      }));
      responseText += formattedTasks.map(
        (task) => `\u2022 ${task.name} (${task.status})
  Type: ${task.type}
  Question: ${task.question}
  ${task.answer ? `Answer: ${task.answer}
` : ""}  Last Updated: ${task.updatedAt}`
      ).join("\n\n");
      callback?.({ text: responseText });
      return true;
    } catch (error) {
      elizaLogger3.error("Error in getQuestStatus handler:", error);
      callback?.({
        text: "I apologize, but I'm having trouble retrieving your quest status at the moment. Please try again later."
      });
      return false;
    }
  }
};

// src/actions/getDataVerification.ts
import {
  elizaLogger as elizaLogger4
} from "@elizaos/core";
var getDataVerification = {
  name: "GET_RAIIN_DATA_VERIFICATION",
  similes: [
    "VERIFY_DATA",
    "CHECK_DATA",
    "GET_RAIIN_VERIFICATION_DATA",
    "GET_RAIIN_VERIFICATION"
  ],
  description: "Verifies data through the Raiinmaker validation service",
  examples: getDataVerificationExample,
  validate: async (runtime, message) => {
    try {
      await validateRaiinmakerConfig(runtime);
      return true;
    } catch (error) {
      elizaLogger4.error("Validation failed:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    try {
      const config = await validateRaiinmakerConfig(runtime);
      if (!config) {
        callback({
          text: `Raiinmaker API configuration is not properly set up.`,
          proceed: false
        });
        return false;
      }
      const raiinService = createRaiinmakerService(
        config.RAIINMAKER_API_KEY,
        config.RAIINMAKER_APP_ID
      );
      const verificationResult = await raiinService.getDataVerification(
        message.content.text
      );
      elizaLogger4.success("Successfully retrieved data verification");
      const { classification, message: verificationMessage, date, time } = verificationResult;
      let responseText = "";
      let proceed = false;
      switch (classification.toLowerCase()) {
        case "approved":
        case "valid":
        case "success":
          responseText = `\u2705 The content has been verified and approved.

Verification details:
- Status: ${classification}
- Message: ${verificationMessage}
- Verified on: ${date} at ${time}`;
          proceed = true;
          break;
        case "pending":
        case "processing":
          responseText = `\u23F3 Your content is still being processed.

Verification details:
- Status: ${classification}
- Message: ${verificationMessage}
- Submitted on: ${date} at ${time}

Please check back later for the final result.`;
          proceed = false;
          break;
        case "rejected":
        case "invalid":
        case "failed":
          responseText = `\u274C The content verification was not successful.

Verification details:
- Status: ${classification}
- Reason: ${verificationMessage}
- Verified on: ${date} at ${time}

Please review and modify your content according to the feedback.`;
          proceed = false;
          break;
        default:
          responseText = `\u2139\uFE0F Verification result received.

Verification details:
- Status: ${classification}
- Message: ${verificationMessage}
- Processed on: ${date} at ${time}`;
          proceed = false;
      }
      callback({
        text: responseText,
        proceed
      });
      return proceed;
    } catch (error) {
      elizaLogger4.error("Error in getDataVerification handler:", error);
      callback({
        text: "I apologize, but I'm having trouble verifying the data at the moment. Please try again later.",
        proceed: false
      });
      return false;
    }
  }
};

// src/actions/verifyGenerationContent.ts
import {
  elizaLogger as elizaLogger6
} from "@elizaos/core";

// src/services/contentPreVerificationService.ts
import { elizaLogger as elizaLogger5 } from "@elizaos/core";
async function preVerifyContent(runtime, content, checklistItems = DEFAULT_CHECKLIST) {
  try {
    const enabled = await isPreVerificationEnabled(runtime);
    if (!enabled) {
      elizaLogger5.info("Content pre-verification is disabled or OpenAI API key not configured, skipping check");
      return { passes: true, failedChecks: [] };
    }
    const apiKey = runtime.getSetting("OPENAI_API_KEY") || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      elizaLogger5.warn("OpenAI API key not found, skipping pre-verification");
      return { passes: true, failedChecks: [] };
    }
    const prompt = `
You are a content verification assistant. Your job is to check if the content below follows all the guidelines in the checklist.
Respond in JSON format with "passes" (boolean), "failedChecks" (array of failed checks), and "suggestedFix" (string with proposed edits if any).

CONTENT TO VERIFY:
"""
${content}
"""

CHECKLIST:
${checklistItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}

RESPOND ONLY WITH JSON:
`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        // Using a smaller model for efficiency and cost savings
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        // Low temperature for more consistent, rule-based checking
        response_format: { type: "json_object" }
      })
    });
    const result = await response.json();
    if (result.error) {
      elizaLogger5.error(`OpenAI API error: ${result.error.message}`);
      throw new Error(`OpenAI API error: ${result.error.message}`);
    }
    let verification;
    try {
      verification = JSON.parse(result.choices[0].message.content);
    } catch (parseError) {
      elizaLogger5.error("Failed to parse OpenAI response:", parseError);
      elizaLogger5.debug("Raw OpenAI response:", result.choices[0].message.content);
      throw new Error("Failed to parse verification result");
    }
    const isDev = runtime.getSetting("RAIINMAKER_ENVIRONMENT") === "development";
    if (isDev) {
      elizaLogger5.debug("OpenAI verification response:", verification);
    }
    elizaLogger5.info(`Pre-verification result: ${verification.passes ? "PASSED" : "FAILED"}`);
    if (!verification.passes) {
      elizaLogger5.info(`Failed checks: ${verification.failedChecks.join(", ")}`);
    }
    return verification;
  } catch (error) {
    elizaLogger5.error("Error in content pre-verification:", error);
    return { passes: true, failedChecks: [] };
  }
}
var DEFAULT_CHECKLIST = [
  "Content does not contain hate speech or discriminatory language",
  "Content is appropriate for the target audience",
  "Content aligns with the agent's persona and purpose",
  "Content does not contain unsafe advice or recommendations",
  "Content follows platform guidelines for the intended social network",
  "Content is free from profanity or explicit material"
];

// src/utils/contentExtractor.ts
function extractVerifiableContent(messageText) {
  const quotedSingleContent = messageText.match(/'([^']+)'/);
  const quotedDoubleContent = messageText.match(/"([^"]+)"/);
  if (quotedSingleContent && quotedSingleContent[1]) {
    return quotedSingleContent[1];
  }
  if (quotedDoubleContent && quotedDoubleContent[1]) {
    return quotedDoubleContent[1];
  }
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
  const cleanedMessage = messageText.replace(/(?:can you |please |could you )?(?:verify|check|validate|is this good|is this appropriate)(?:\s+if|\s+whether)?\s*/i, "").replace(/(?:this |the |following |content |tweet |post |message )+/i, "").trim();
  return cleanedMessage;
}

// src/utils/uuidHelpers.ts
import { v4 as uuidv4 } from "uuid";
function ensureUUID(id) {
  if (!id) {
    return uuidv4();
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return uuidv4();
}

// src/actions/verifyGenerationContent.ts
import { z as z2 } from "zod";
var verifyGenerationContentOptionsSchema = z2.object({
  content: z2.string().min(1, "Content is required").optional(),
  consensusVotes: z2.number().min(1).optional(),
  question: z2.string().optional(),
  roomId: z2.string().optional(),
  name: z2.string().optional(),
  // Add option to skip pre-verification for testing/comparison
  skipPreVerification: z2.boolean().optional()
}).optional();
var verifyGenerationContentExamples = [
  [
    {
      user: "{{user1}}",
      content: {
        text: 'Please verify this content: "Hello world, this is a test tweet!"'
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "I'll submit that content for verification.",
        action: "VERIFY_GENERATION_CONTENT"
      }
    }
  ]
];
var verifyGenerationContent = {
  name: "VERIFY_GENERATION_CONTENT",
  similes: [
    "CHECK_CONTENT",
    "VALIDATE_TWEET",
    "VERIFY_TWEET",
    "VERIFY_POST"
  ],
  description: "Submits content to the Raiinmaker app for verification to determine if it's appropriate for posting",
  examples: verifyGenerationContentExamples,
  validate: async (runtime, message) => {
    try {
      await validateRaiinmakerConfig(runtime);
      return true;
    } catch (error) {
      elizaLogger6.error("Validation failed:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, options, callback) => {
    try {
      const parsedOptions = verifyGenerationContentOptionsSchema.parse(options);
      const config = await validateRaiinmakerConfig(runtime);
      if (!config) {
        if (callback) {
          callback({
            text: `
Raiinmaker API configuration is not properly set up. 

Please ensure the following environment variables are set:
- RAIINMAKER_APP_ID: Your Raiinmaker application ID
- RAIINMAKER_API_KEY: Your Raiinmaker API key
                        `
          });
        }
        return false;
      }
      let contentToVerify;
      if (parsedOptions && parsedOptions.content) {
        contentToVerify = parsedOptions.content;
      } else {
        contentToVerify = extractVerifiableContent(message.content.text);
      }
      if (!contentToVerify || contentToVerify.trim().length === 0) {
        if (callback) {
          callback({
            text: "I couldn't identify any content to verify. Please provide some content by quoting it or clearly indicating what you'd like me to verify."
          });
        }
        return false;
      }
      const userId = ensureUUID(message.userId);
      elizaLogger6.info(`Processing verification for content from user ${userId}`);
      let preVerificationResult;
      if (!parsedOptions?.skipPreVerification) {
        elizaLogger6.info("Running content pre-verification check");
        let customChecklist;
        const settings = runtime.character?.settings;
        if (settings && Array.isArray(settings.contentChecklist)) {
          customChecklist = settings.contentChecklist;
          elizaLogger6.debug("Using custom content checklist from character settings");
        }
        preVerificationResult = await preVerifyContent(
          runtime,
          contentToVerify,
          customChecklist
        );
        if (preVerificationResult.passes) {
          elizaLogger6.info("Content passed pre-verification checks, skipping human verification");
          const autoVerifiedTaskId = ensureUUID(`auto-verified-${Date.now()}`);
          if (callback) {
            callback({
              text: `
I've analyzed your content using AI verification and it looks good to go!

\u{1F4CB} Content: "${contentToVerify.substring(0, 100)}${contentToVerify.length > 100 ? "..." : ""}"

\u2705 All guidelines passed
\u2022 Content is appropriate for posting
\u2022 No policy violations found

The content has been approved automatically. No human verification was needed.
                            `,
              status: "approved",
              skipHumanVerification: true,
              // Add these fields for Twitter client compatibility
              taskId: autoVerifiedTaskId,
              verificationResult: {
                taskId: autoVerifiedTaskId,
                status: "completed",
                answer: true,
                question: "Is this content appropriate for posting?",
                subject: contentToVerify,
                votesReceived: 0,
                votesRequired: 0,
                votesYes: 0,
                votesNo: 0,
                formattedText: `\u2705 Content Verification - The verification is complete. The content was approved automatically by AI.`
              }
            });
          }
          await runtime.messageManager.createMemory({
            id: ensureUUID(`verification-auto-approved-${Date.now()}`),
            userId,
            agentId: ensureUUID(runtime.agentId),
            content: {
              text: `Content auto-approved by AI verification: "${contentToVerify.substring(0, 50)}..."`,
              metadata: {
                taskType: "contentAutoApproved",
                taskId: autoVerifiedTaskId,
                content: contentToVerify,
                timestamp: Date.now()
              }
            },
            roomId: ensureUUID(parsedOptions?.roomId || message.roomId),
            createdAt: Date.now()
          });
          return true;
        }
        elizaLogger6.info(`Content failed pre-verification checks: ${preVerificationResult.failedChecks.join(", ")}`);
        elizaLogger6.info("Content failed pre-verification, proceeding to human verification");
      }
      if (parsedOptions?.skipPreVerification || preVerificationResult && !preVerificationResult.passes) {
        const raiinService = createRaiinmakerService(
          config.RAIINMAKER_API_KEY,
          config.RAIINMAKER_APP_ID
        );
        const taskOptions = {
          name: parsedOptions?.name || "Content Verification",
          consensusVotes: parsedOptions?.consensusVotes || 3,
          question: parsedOptions?.question || "Is this content appropriate for an AI agent to post?"
        };
        const verificationResult = await raiinService.createGenerationVerificationTask(
          contentToVerify,
          taskOptions
        );
        if (!verificationResult || !verificationResult.data || !verificationResult.data.id) {
          elizaLogger6.error("Failed to create verification task: Invalid response from Raiinmaker service");
          if (callback) {
            callback({
              text: "I apologize, but I wasn't able to submit the content for verification. There might be an issue with the verification service."
            });
          }
          return false;
        }
        const taskId = verificationResult.data.id;
        const roomId = ensureUUID(parsedOptions?.roomId || message.roomId);
        await runtime.messageManager.createMemory({
          id: ensureUUID(`verification-${taskId}`),
          userId,
          agentId: ensureUUID(runtime.agentId),
          content: {
            text: `Verification task created for "${contentToVerify.substring(0, 50)}..." with ID: ${taskId}`,
            metadata: {
              taskType: "contentVerification",
              taskId,
              content: contentToVerify,
              timestamp: Date.now()
            }
          },
          roomId,
          createdAt: Date.now()
        });
        if (callback) {
          callback({
            text: `
I've submitted your content for verification through the Raiinmaker network.

\u{1F4CB} Content: "${contentToVerify.substring(0, 100)}${contentToVerify.length > 100 ? "..." : ""}"

\u{1F50D} Task ID: ${taskId}

The content will be reviewed by human validators in the Raiinmaker network. They'll determine if the content is appropriate for posting based on community guidelines.

You can check the status of this verification later by asking me about this task using the Task ID.

\u23F3 The verification process typically takes a few minutes to a few hours, depending on validator availability.
                        `,
            taskId,
            status: "pending"
          });
        }
      }
      return true;
    } catch (error) {
      if (error instanceof RaiinmakerApiError) {
        elizaLogger6.error(`Raiinmaker API Error: ${error.message}`, error);
        callback?.({
          text: `There was an error with the Raiinmaker API: ${error.message}

This might indicate an issue with your API credentials or the API service.`
        });
      } else {
        elizaLogger6.error("Error in verifyGenerationContent handler:", error);
        callback?.({
          text: "I apologize, but I'm having trouble submitting the content for verification at the moment. Please try again later."
        });
      }
      return false;
    }
  }
};

// src/actions/checkVerificationStatus.ts
import {
  elizaLogger as elizaLogger8
} from "@elizaos/core";

// src/utils/responseFormatter.ts
import { elizaLogger as elizaLogger7 } from "@elizaos/core";
function formatVerificationStatusResponse(task) {
  try {
    const id = task.id || "";
    const status = task.status || "unknown";
    const question = task.question || "";
    const subject = task.subject || "";
    let parsedAnswer = null;
    if (task.answer === "true" || task.answer === "yes") {
      parsedAnswer = true;
    } else if (task.answer === "false" || task.answer === "no") {
      parsedAnswer = false;
    }
    const votes = task.votes || [];
    const consensusVotes = task.consensusVotes || 0;
    const yesVotes = votes.filter((v) => v.answer === "true").length;
    const noVotes = votes.filter((v) => v.answer === "false").length;
    const shortId = id.length > 8 ? `${id.substring(0, 8)}...` : id;
    let statusEmoji = "\u23F3";
    if (status === "completed") {
      statusEmoji = parsedAnswer === true ? "\u2705" : "\u274C";
    }
    let statusText = "";
    if (status === "completed") {
      statusText = `The verification is complete. The content was ${parsedAnswer ? "approved" : "rejected"}.`;
    } else if (status === "pending") {
      statusText = `The verification is still in progress. ${votes.length} of ${consensusVotes} required votes collected.`;
    } else {
      statusText = `Status: ${status}`;
    }
    const formattedText = `${statusEmoji} Content Verification (ID: ${shortId}) - ${statusText}`;
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
    elizaLogger7.error("Error formatting verification response:", error);
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

// src/actions/checkVerificationStatus.ts
import { z as z3 } from "zod";
var checkVerificationStatusExamples = [
  [
    {
      user: "{{user1}}",
      content: {
        text: "What's the status of my content verification with task ID abc123?"
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "Let me check the status of your verification task.",
        action: "CHECK_VERIFICATION_STATUS"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "Has my tweet been verified yet? The task ID is xyz789."
      }
    },
    {
      user: "{{agent}}",
      content: {
        text: "I'll check if your tweet has been verified.",
        action: "CHECK_VERIFICATION_STATUS"
      }
    }
  ]
];
var checkVerificationStatusOptionsSchema = z3.object({
  taskId: z3.string().min(1, "Task ID is required").optional()
}).optional();
var checkVerificationStatus = {
  name: "CHECK_VERIFICATION_STATUS",
  similes: [
    "GET_VERIFICATION_STATUS",
    "CHECK_CONTENT_STATUS",
    "VERIFY_STATUS",
    "CHECK_TASK_STATUS"
  ],
  description: "Checks the status of a content verification task in the Raiinmaker app",
  examples: checkVerificationStatusExamples,
  validate: async (runtime, message) => {
    try {
      await validateRaiinmakerConfig(runtime);
      return true;
    } catch (error) {
      elizaLogger8.error("Validation failed:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, options, callback) => {
    try {
      const config = await validateRaiinmakerConfig(runtime);
      if (!config) {
        if (callback) {
          callback({
            text: `No Raiinmaker credentials available. Please set up credentials first.`
          });
        }
        return false;
      }
      const raiinService = createRaiinmakerService(
        config.RAIINMAKER_API_KEY,
        config.RAIINMAKER_APP_ID
      );
      const parsedOptions = checkVerificationStatusOptionsSchema.parse(options);
      let taskId;
      if (parsedOptions && parsedOptions.taskId) {
        taskId = parsedOptions.taskId;
      } else {
        const messageText = message.content.text;
        const idMatch = messageText.match(/task\s*ID\s*(?:is|:|=)?\s*([a-zA-Z0-9-]+)/i) || messageText.match(/(?:check|verify|status|task)\s*(?:for|of)?\s*([a-f0-9-]{8,})/i) || messageText.match(/([a-f0-9-]{8,})/i);
        if (idMatch && idMatch[1]) {
          taskId = idMatch[1];
        } else {
          const recentMemories = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 10
          });
          for (const mem of recentMemories) {
            const metadata = mem?.content?.metadata;
            if (metadata && typeof metadata === "object" && "taskId" in metadata && typeof metadata.taskId === "string") {
              taskId = metadata.taskId;
              break;
            } else if (mem.content?.text && typeof mem.content.text === "string") {
              const textMatch = mem.content.text.match(/task\s*ID\s*(?:is|:|=)?\s*([a-zA-Z0-9-]+)/i) || mem.content.text.match(/([a-f0-9-]{8,})/i);
              if (textMatch && textMatch[1]) {
                taskId = textMatch[1];
                break;
              }
            }
          }
          if (!taskId) {
            if (callback) {
              callback({
                text: "I couldn't find a task ID in your message or our recent conversation. Please provide a valid task ID to check the verification status."
              });
            }
            return false;
          }
        }
      }
      const taskResult = await raiinService.getTaskById(taskId);
      if (!taskResult.success || !taskResult.data) {
        if (callback) {
          callback({
            text: `I couldn't find any verification task with ID ${taskId}. Please check the ID and try again.`,
            status: "unknown",
            answer: null
          });
        }
        return false;
      }
      const task = taskResult.data;
      elizaLogger8.info(`Raw task data: status=${task.status}, answer=${task.answer}`);
      const formattedResponse = formatVerificationStatusResponse(task);
      elizaLogger8.info(`FINAL VERIFICATION STATUS: status=${formattedResponse.status}, answer=${formattedResponse.answer}`);
      if (formattedResponse.status === "completed") {
        elizaLogger8.info(`Task ${taskId} ${formattedResponse.answer ? "APPROVED" : "REJECTED"}`);
      } else if (formattedResponse.status === "pending") {
        elizaLogger8.info(`PENDING: Task ${taskId} is still pending (status: ${formattedResponse.status})`);
      }
      if (callback) {
        callback({
          text: formattedResponse.formattedText || `Verification status: ${formattedResponse.status}`,
          verificationResult: formattedResponse,
          // Include the entire structured response
          status: formattedResponse.status,
          answer: formattedResponse.answer
        });
      }
      return true;
    } catch (error) {
      elizaLogger8.error("Error in checkVerificationStatus handler:", error);
      callback?.({
        text: "I apologize, but I'm having trouble checking the verification status at the moment. Please try again later.",
        status: "error",
        answer: null
      });
      return false;
    }
  }
};

// src/index.ts
var raiinmakerPlugin = {
  name: "raiinmaker",
  description: "Plugin for ElizaOS to integrate with the Raiinmaker app for content verification and validation",
  actions: [
    getQuestStatus,
    getDataVerification,
    verifyGenerationContent,
    checkVerificationStatus
  ],
  evaluators: [],
  providers: []
};
var index_default = raiinmakerPlugin;
export {
  createRaiinmakerService,
  index_default as default,
  formatVerificationStatusResponse,
  isActionAllowedInEnvironment,
  isDevelopmentEnvironment,
  isPreVerificationEnabled,
  preVerifyContent,
  raiinmakerPlugin,
  validateRaiinmakerConfig
};
//# sourceMappingURL=index.js.map