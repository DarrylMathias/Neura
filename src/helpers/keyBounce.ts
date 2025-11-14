import { AgentState } from "@/types/AgentState";
import { MyUIMessage } from "@/types/types";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { UIMessageStreamWriter } from "ai";
import axios from "axios";
import "dotenv/config";

export const bounceKey = async (
  userId: string,
  writer: UIMessageStreamWriter<MyUIMessage>,
  state: AgentState
) => {
  const res = await axios.get(
    `/api/health/agents?securityKey=${process.env.API_SECURITY_KEY}`
  );
  const data = res.data;
  const workingKeys = Object.values(data)
    .filter((k: any) => k && k.works && k.key)
    .map((k: any) => k.key);

  if (workingKeys.length === 0) {
    throw new Error("All API keys are extinguished.");
  }

  const maxRetries = Math.min(workingKeys.length, 3);
  console.log(
    `[Agent] Found ${workingKeys.length} working keys. Max retries set to ${maxRetries}.`
  );

  const googleInstance = (key: string) => {
    const google = createGoogleGenerativeAI({ apiKey: key });
    return google("gemini-2.5-flash");
  };

  const getModelForKey = (key: string) => {
    const googleAI = googleInstance(key);
    return withSupermemory(googleAI, userId, {
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
