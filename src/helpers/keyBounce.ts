import { AgentState } from "@/types/AgentState";
import { MyUIMessage } from "@/types/types";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { generateText, UIMessageStreamWriter } from "ai";
import "dotenv/config";

const googleInstance = (key: string) => {
  const google = createGoogleGenerativeAI({ apiKey: key });
  return google("gemini-2.5-flash");
};

async function checkKey(key?: string) {
  if (!key) {
    console.log("[HealthCheck] KEY NOT PROVIDED");
    return { key, works: false, error: "Key not provided" };
  }
  try {
    const result = await generateText({
      model: googleInstance(key),
      prompt: "Give me a one-word answer: Hello",
    });

    return result.text.trim().length > 0
      ? { key, works: true }
      : { key, works: false, error: "Empty response" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    if (errorMessage.includes("API key is missing") || errorMessage.includes("AI_LoadAPIKeyError")) {
      console.warn(`[HealthCheck] Key ...${key.slice(-4)} is invalid or missing.`);
      return { key, works: false, error: "Invalid API Key" };
    }
    
    if (errorMessage.includes("quota")) {
      console.warn(`[HealthCheck] Key ...${key.slice(-4)} has exceeded its quota.`);
      return { key, works: false, error: "Quota Exceeded" };
    }

    if (errorMessage.includes("overloaded")) {
        console.warn(`[HealthCheck] Key ...${key.slice(-4)} failed: Model overloaded.`);
        return { key, works: false, error: "Model Overloaded" };
    }

    console.warn(`[HealthCheck] Key ...${key.slice(-4)} failed unknown error:`, errorMessage);
    return { key, works: false, error: "Unknown Error" };
  }
}

export const bounceKey = async (
  userId: string,
  writer: UIMessageStreamWriter<MyUIMessage>,
  state: AgentState
) => {
  console.log("Started key bounce / health check...");

  const [k1, k2, k3, k4] = await Promise.all([
    checkKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY_1),
    checkKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY_2),
    checkKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY_3),
    checkKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY_4),
  ]);

  const results = {
    API_KEY_1: k1,
    API_KEY_2: k2,
    API_KEY_3: k3,
    API_KEY_4: k4,
  };

  console.log("[HealthCheck] Results:", JSON.stringify(results, null, 2));

  const workingKeys = Object.values(results)
    .filter((k) => k.works && k.key) 
    .map((k) => k.key as string);

  if (workingKeys.length === 0) {
    console.error("[Agent] All API keys are extinguished or invalid.");
    writer.write({
        type: "data-Error",
        data: { 
            agentData: "A fatal server error occurred: All API keys have failed.",
            input: JSON.stringify(results, null, 2)
        },
      });
    throw new Error("All API keys are extinguished.");
  }

  const maxRetries = Math.min(workingKeys.length, 5);
  console.log(
    `[Agent] Found ${workingKeys.length} working keys. Max retries set to ${maxRetries}.`
  );

  const getModelForKey = (key: string) => {
    const google = createGoogleGenerativeAI({ apiKey: key });;
    return withSupermemory(google("gemini-2.5-flash"), userId, {
      mode: "full",
    });
  };

  return {
    streamingModel: getModelForKey(workingKeys[0]),
    safeRun: async (
      name: string,
      type: "generate" | "stream",
      fn: (model?: any) => Promise<void>
    ) => {
      try {
        if (type === "generate") {
          let lastError: any = null;
          for (let i = 0; i < maxRetries; i++) {
            const currentKey = workingKeys[i];
            console.log(
              `[${name}] Attempt ${
                i + 1
              }/${maxRetries} using key ...${currentKey.slice(-4)}`
            );

            try {
              const modelInstance = getModelForKey(currentKey);
              await fn(modelInstance);
              return; 
            } catch (err) {
              console.warn(
                `[${name}] Attempt ${i + 1}/${maxRetries} failed:`,
                err instanceof Error ? err.message : String(err)
              );
              lastError = err;
            }
          }
          console.error(`[${name}] All ${maxRetries} retry attempts failed.`);
          throw lastError;
        } else {
          await fn();
        }
      } catch (err) {
        console.error(`[${name}] Error:`, err);
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        writer.write({
          type: "data-Error",
          data: { agentData: `[${name}] failed:\n\n ${msg}` },
        });
        state.errors = `[${name}] failed:\n\n ${msg}`;
      }
    },
  };
};