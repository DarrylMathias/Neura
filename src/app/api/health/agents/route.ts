import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";

const googleInstance = (key: string) => {
  const google = createGoogleGenerativeAI({ apiKey: key });
  return google("gemini-2.5-flash");
};

async function checkKey(key?: string) {
  if (!key) {
    console.log("KEY NOT AVAILABLE");
    return { key, works: false };
  }
  try {
    const result = await streamText({
      model: googleInstance(key),
      prompt: "Hello",
    });
    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
    }

    return text.trim().length > 0
      ? { key, works: true }
      : { key, works: false };
  } catch (err) {
    console.log(err);
    return { key, works: false };
  }
}

export async function GET({
  params,
}: {
  params: Promise<{ securityKey: string }>;
}) {
  const { securityKey } = await params;
  if (!securityKey)
    return NextResponse.json(
      { error: "Security key is required" },
      { status: 400 }
    );
  if (securityKey !== process.env.API_SECURITY_KEY) {
    return NextResponse.json(
      { error: "Invalid security key" },
      { status: 403 }
    );
  }
  const [k1, k2, k3, k4] = await Promise.all([
    checkKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY_1),
    checkKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY_2),
    checkKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY_3),
    checkKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY_4),
  ]);

  return NextResponse.json({
    results: {
      API_KEY_1: k1,
      API_KEY_2: k2,
      API_KEY_3: k3,
      API_KEY_4: k4,
    },
  });
}
