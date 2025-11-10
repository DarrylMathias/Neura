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
import { Fragment, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Response } from "@/components/ai-elements/response";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
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
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

const models = [
  { name: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  { name: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
];

const ChatBotDemo = ({
  location,
}: {
  location: { latitude: number; longitude: number };
}) => {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const { messages, sendMessage, status, regenerate } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) return;

    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      { body: { model, location } }
    );

    setInput("");
    if (message.files) message.files.length = 0; // clear attachments
  };

  return (
    <div className="w-full h-full p-4 md:p-6 bg-zinc-950 overflow-hidden">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent className="overflow-y-auto max-h-[70vh] md:max-h-none">
            {messages.map((message, messageIndex) => (
              <div key={message.id}>
                {message.role === "assistant" &&
                  message.parts.filter((p) => p.type === "source-url").length >
                    0 && (
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
                            <Source href={part.url} title={part.url} />
                          </SourcesContent>
                        ))}
                    </Sources>
                  )}

                {message.parts.map((part, i) => {
                  console.log(part);
                  switch (part.type) {
                    case "text":
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <Response className="break-words whitespace-pre-wrap">
                                {part.text}
                              </Response>
                            </MessageContent>
                          </Message>

                          {message.role === "assistant" &&
                            i === message.parts.length - 1 && (
                              <Actions className="mt-2">
                                <Action
                                  onClick={() => regenerate()}
                                  label="Retry"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </Action>
                                <Action
                                  onClick={() =>
                                    navigator.clipboard.writeText(part.text)
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
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );

                    default:
                      if (part.type?.startsWith("tool-")) {
                        return (
                          <Tool key={`${message.id}-${i}`} defaultOpen={false}>
                            <ToolHeader type={part.type} state={part.state} />
                            <ToolContent>
                              <pre>
                                <ToolInput input={part.input} />
                                <ToolOutput
                                  output={
                                    part.output
                                      ? typeof part.output === "string"
                                        ? part.output
                                        : JSON.stringify(part.output, null, 2)
                                      : "No data available."
                                  }
                                  errorText={part.errorText}
                                  type="tool"
                                />
                              </pre>
                            </ToolContent>
                          </Tool>
                        );
                      }

                      if (
                        part.type?.startsWith("data-") &&
                        messageIndex == messages.length - 1
                      ) {
                        console.log(part.type);
                        return (
                          <Tool key={`${message.id}-${i}`} defaultOpen={false}>
                            <ToolHeader
                              type={part.type}
                              state={
                                part.type === "data-Error"
                                  ? "output-error"
                                  : "output-available"
                              }
                            />
                            <ToolContent>
                              <pre>
                                {part.type !== "data-Error" && (
                                  <ToolInput input={part.data.input} />
                                )}
                                {part.type !== "data-Error" ? (
                                  <ToolOutput
                                    output={
                                      part.data.agentData
                                        ? typeof part.data.agentData ===
                                          "string"
                                          ? part.data.agentData
                                          : JSON.stringify(
                                              part.data.agentData,
                                              null,
                                              2
                                            )
                                        : "No data available."
                                    }
                                    errorText={part.errorText}
                                    type="data"
                                  />
                                ) : (
                                  <ToolOutput
                                    output=""
                                    errorText={part.data.agentData}
                                    type="data"
                                  />
                                )}
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
            {status === "submitted" && <Loader />}
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

            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;
