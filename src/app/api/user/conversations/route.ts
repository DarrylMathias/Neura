import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UIMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";
import {Role} from '@/generated/client'

function parseMessageForPrisma(message: UIMessage) {
  const parts = message.parts || [];
  
  const textPart = parts.filter((part) => part.type === "text");
  const reasoningParts = parts.filter((part) => part.type === "reasoning");
  const sourceURLParts = parts.filter((part) => part.type === "source-url");
  const agentParts = parts.filter((part) => part.type.startsWith("data-"));
  const toolParts = parts.filter((part) => part.type.startsWith("tool-"));
  const fileParts = parts.filter((part) => part.type === "file");

  // If there are no text parts but there is message.content, use that
  const contentText = textPart.length > 0 
    ? textPart.map((singleText: any) => singleText.text).join(", ")
    : message.content || "";

  // 5. Build the Prisma data object
  const prismaData = {
    message: message as any, // Raw JSON
    role: message.role.toUpperCase() === "USER" ? Role.user : Role.assistant,
    content: contentText,
    agentName: agentParts.map((agent) => agent.type).join(", "),
    toolUsed: toolParts.map((tool) => tool.type).join(", "),
    sourceURL: sourceURLParts.map((source: any) => source.url).join(", "),
    file: fileParts.map((file: any) => file.filename).join(", "),
    reasoning: reasoningParts.map((reason: any) => reason.text).join(", "),
  };

  return prismaData;
}

export async function POST(req: NextRequest) {
  try {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress;
      if (email) {
        const oldUser = await prisma.user.findUnique({ where: { email } });
        if (oldUser) {
          // Auto-heal the database
          await prisma.user.update({
            where: { id: oldUser.id },
            data: { email: `migrated_${oldUser.id}_${email}` },
          });

          user = await prisma.user.create({
            data: {
              id: userId,
              email: email,
              first_name: clerkUser.firstName,
              last_name: clerkUser.lastName,
            },
          });

          await prisma.conversation.updateMany({
            where: { userId: oldUser.id },
            data: { userId: user.id },
          });

          try {
            await prisma.user.delete({ where: { id: oldUser.id } });
          } catch (e) {
            console.error("Could not delete old user:", e);
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    let conversation;
    if (existingConversation) {
      conversation = await prisma.conversation.update({
        where: { id: existingConversation.id },
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
          userId: user.id,
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

export async function GET(req: NextRequest) {
  try {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress;
      if (email) {
        const oldUser = await prisma.user.findUnique({ where: { email } });
        if (oldUser) {
          // Auto-heal the database
          await prisma.user.update({
            where: { id: oldUser.id },
            data: { email: `migrated_${oldUser.id}_${email}` },
          });

          user = await prisma.user.create({
            data: {
              id: userId,
              email: email,
              first_name: clerkUser.firstName,
              last_name: clerkUser.lastName,
            },
          });

          await prisma.conversation.updateMany({
            where: { userId: oldUser.id },
            data: { userId: user.id },
          });

          try {
            await prisma.user.delete({ where: { id: oldUser.id } });
          } catch (e) {
            console.error("Could not delete old user:", e);
          }
        }
      }
    }

    const dbUserId = user ? user.id : userId;

    console.log("[DEBUG] Fetching history for userId:", dbUserId);

    const conversation = await prisma.conversation.findFirst({
      where: { userId: dbUserId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      console.log("[DEBUG] No conversation found for user.");
      return NextResponse.json({ messages: [] }, { status: 200 });
    }

    console.log(`[DEBUG] Found conversation ${conversation.id} with ${conversation.messages.length} messages.`);

    // messages is stored as JSON in Prisma, return it directly
    const formattedMessages = conversation.messages.map((m) => {
      // Prisma stores the raw message object in the `message` Json field
      const msg = m.message as any;
      return {
        ...msg,
        createdAt: msg.createdAt || m.createdAt
      };
    });

    console.log("[DEBUG] Formatted messages length:", formattedMessages.length);

    return NextResponse.json({ messages: formattedMessages }, { status: 200 });
  } catch (err) {
    console.error("Error fetching conversation:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(err) },
      { status: 500 }
    );
  }
}

