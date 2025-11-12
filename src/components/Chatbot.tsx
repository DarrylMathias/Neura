"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Fragment, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { CopyIcon, RefreshCcwIcon, TriangleAlertIcon } from "lucide-react";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Loader } from "@/components/ai-elements/loader";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { MapMarker, MapRoute, MapView } from "@/types/map";

const models = [
  { name: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  { name: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
];

function safeStringify(v: unknown) {
  try {
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "string") return v;
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

const ChatBotDemo = ({
  location,
  onUpdateMarkers,
  onUpdateRoutes,
  onSetMapView,
}: {
  location: { latitude: number; longitude: number };
  onUpdateMarkers: (markers: MapMarker[]) => void;
  onUpdateRoutes: (routes: MapRoute[]) => void;
  onSetMapView: (view: MapView) => void;
}) => {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [error, setError] = useState<string | null>(null);
  const { messages, sendMessage, status, regenerate, stop } = useChat();

  const handleSubmit = async (message: PromptInputMessage) => {
    setError(null);
    const hasText = Boolean(message.text?.trim());
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) return;

    try {
      setInput("");
      await sendMessage(
        {
          text: message.text || "Sent with attachments",
          files: message.files,
        },
        { body: { model, location } }
      );
      if (message.files) message.files.length = 0;
    } catch (err) {
      console.error(err);
      setError("Failed to send message. Please try again.");
    }
  };

  const handleRetry = async () => {
    setError(null);
    try {
      await regenerate();
    } catch (err) {
      console.error(err);
      setError("Regeneration failed. Please retry later.");
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy text to clipboard.");
    }
  };

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== "assistant") return;

    const toolCalls = lastMessage.parts.filter((part) =>
      part.type.startsWith("tool-")
    );

    if (toolCalls.length === 0) return;

    for (const toolCall of toolCalls) {
      try {
        switch (toolCall.type) {
          case "tool-updateMarkers":
            console.log("Marker update");
            onUpdateMarkers(
              ((toolCall.output as any)?.data ?? []) as MapMarker[]
            );
            break;
          case "tool-updateRoutes":
            console.log("Routes update");
            onUpdateRoutes(((toolCall.output as any) ?? []) as MapRoute[]);
            break;
          case "tool-setMapView":
            console.log("Views update");
            onSetMapView(((toolCall.output as any)?.data ?? {}) as MapView);
            break;
          default:
          // console.warn("Unknown tool call:", toolCall.type);
        }
      } catch (err) {
        console.error("Failed to process tool call:", toolCall.type, err);
      }
    }
    console.log(toolCalls);

    // This hook runs *only* when the messages array changes.
    // We disable the eslint rule because we *intentionally*
    // don't want this to re-run if the prop functions change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <div className="w-full h-full p-4 md:p-6 bg-zinc-950 overflow-hidden">
      <div className="flex flex-col h-full">
        {error && (
          <div className="bg-red-600/10 border border-red-600 text-red-400 p-2 mb-2 rounded-md text-sm flex items-center gap-2">
            <TriangleAlertIcon className="w-4 h-4" />
            {error}
          </div>
        )}

        <Conversation className="flex-1 min-h-0">
          <ConversationContent className="max-h-[70vh] md:max-h-none">
            {messages.map((message, messageIndex) => (
              <div key={message.id}>
                {message.role === "assistant" &&
                  message.parts?.some((p) => p.type === "source-url") && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts.filter((p) => p.type === "source-url")
                            .length
                        }
                      />
                      {message.parts
                        .filter((p) => p.type === "source-url")
                        .map((part, i) => (
                          <SourcesContent key={`${message.id}-${i}`}>
                            <Source
                              href={part.url ?? "#"}
                              title={part.url ?? "Unknown source"}
                            />
                          </SourcesContent>
                        ))}
                    </Sources>
                  )}

                {message.parts?.map((part, i) => {
                  if (!part || !part.type) return null;

                  switch (part.type) {
                    case "text":
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <Response className="wrap-break-word whitespace-pre-wrap">
                                {part.text ?? ""}
                              </Response>
                            </MessageContent>
                          </Message>

                          {message.role === "assistant" &&
                            i === message.parts.length - 1 && (
                              <Actions className="mt-2">
                                <Action onClick={handleRetry} label="Retry">
                                  <RefreshCcwIcon className="size-3" />
                                </Action>
                                <Action
                                  onClick={() =>
                                    handleCopy(part.text ?? "(no text)")
                                  }
                                  label="Copy"
                                >
                                  <CopyIcon className="size-3" />
                                </Action>
                              </Actions>
                            )}
                        </Fragment>
                      );

                    case "reasoning":
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={
                            status === "streaming" &&
                            i === message.parts.length - 1 &&
                            message.id === messages.at(-1)?.id
                          }
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {part.text ?? "No reasoning text."}
                          </ReasoningContent>
                        </Reasoning>
                      );

                    default:
                      if (part.type.startsWith("tool-")) {
                        const headerState =
                          (part as any).state ?? "output-available";
                        const toolPart = part as any;
                        const outputStr = toolPart.output
                          ? safeStringify(toolPart.output)
                          : "No data available.";
                        const errorStr = toolPart.errorText ?? "";
                        return (
                          <Tool key={`${message.id}-${i}`} defaultOpen={false}>
                            <ToolHeader
                              type={part.type as `tool-${string}`}
                              state={headerState}
                            />
                            {part.type !== "tool-updateRoutes" && (
                              <ToolContent>
                                <pre className="wrap-break-word whitespace-pre-wrap">
                                  <ToolOutput
                                    output={outputStr}
                                    errorText={errorStr}
                                  />
                                </pre>
                              </ToolContent>
                            )}
                          </Tool>
                        );
                      }

                      if (
                        part.type.startsWith("data-") &&
                        messageIndex === messages.length - 1
                      ) {
                        const isError = part.type === "data-Error";
                        return (
                          <Tool key={`${message.id}-${i}`} defaultOpen={false}>
                            <ToolHeader
                              type={part.type as `data-${string}`}
                              state={
                                isError ? "output-error" : "output-available"
                              }
                            />
                            <ToolContent>
                              <pre className="wrap-break-word whitespace-pre-wrap">
                                <ToolOutput
                                  output={
                                    isError
                                      ? ""
                                      : safeStringify(
                                          (part as any).data?.agentData ??
                                            "No agent data."
                                        )
                                  }
                                  errorText={
                                    isError
                                      ? (part as any).data?.agentData ??
                                        "Unknown error."
                                      : (part as any).errorText ?? ""
                                  }
                                />
                              </pre>
                            </ToolContent>
                          </Tool>
                        );
                      }

                      return null;
                  }
                })}
              </div>
            ))}
            {(status === "submitted" || status === "streaming") && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          onSubmit={handleSubmit}
          className="mt-2 md:mt-4"
          globalDrop
          multiple
        >
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>

          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>

          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              <PromptInputSelect
                onValueChange={(value) => setModel(value)}
                value={model}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {models.map((m) => (
                    <PromptInputSelectItem key={m.value} value={m.value}>
                      {m.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>

            <PromptInputSubmit
              disabled={!input && !status}
              status={status}
              onAbort={stop}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;
