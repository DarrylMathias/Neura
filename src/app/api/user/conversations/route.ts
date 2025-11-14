import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { UIMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";

const enum Role {
  user = "USER",
  assistant = "ASSISTANT",
}

function parseMessageForPrisma(message: UIMessage) {
  const textPart = message.parts.filter((part) => part.type === "text");
  const reasoningParts = message.parts.filter(
    (part) => part.type === "reasoning"
  );
  const sourceURLParts = message.parts.filter(
    (part) => part.type === "source-url"
  );
  const agentParts = message.parts.filter((part) =>
    part.type.startsWith("data-")
  );
  const toolParts = message.parts.filter((part) =>
    part.type.startsWith("tool-")
  );
  const fileParts = message.parts.filter((part) => part.type === "file");

  // 5. Build the Prisma data object
  const prismaData = {
    message: message,
    role: message.role.toUpperCase() === "USER" ? Role.user : Role.assistant,
    content: textPart.map((singleText) => singleText.text).join(", "),
    agentName: agentParts.map((agent) => agent.type).join(", "),
    toolUsed: toolParts.map((tool) => tool.type).join(", "),
    sourceURL: sourceURLParts.map((source) => source.url).join(", "),
    file: fileParts.map((file) => file.filename).join(", "),
    reasoning: reasoningParts.map((reason) => reason.text).join(", "),
  };

  return prismaData;
}

export async function POST(req: NextRequest) {
  try {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: { userId },
      orderBy : {updatedAt : 'desc'}
    });

    let conversation;
    if (existingConversation) {
      conversation = await prisma.conversation.update({
        where: { id : existingConversation.id },
        data: {
          messages: {
            create: { ...parseMessageForPrisma(message) },
          },
        },
        include: { messages: true },
      });
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          messages: {
            create: { ...parseMessageForPrisma(message) },
          },
        },
        include: { messages: true },
      });
    }

    return NextResponse.json({ success: true, conversation }, { status: 200 });
  } catch (err) {
    console.error("Error saving conversation:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(err) },
      { status: 500 }
    );
  }
}
