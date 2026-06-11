"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";

type StickToBottomContextType = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
};

const StickToBottomContext = createContext<StickToBottomContextType>({
  isAtBottom: true,
  scrollToBottom: () => {},
});

export const useStickToBottomContext = () => useContext(StickToBottomContext);

export type ConversationProps = HTMLAttributes<HTMLDivElement>;

export const Conversation = ({ className, children, ...props }: ConversationProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottomState, setIsAtBottomState] = useState(true);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    isAtBottomRef.current = atBottom;
    setIsAtBottomState(atBottom);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      if (isAtBottomRef.current) {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      }
    });

    observer.observe(el, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  return (
    <StickToBottomContext.Provider value={{ isAtBottom: isAtBottomState, scrollToBottom }}>
      <div className={cn("relative flex-1 flex flex-col min-h-0", className)} {...props}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "flex-1 overflow-y-scroll overscroll-contain",
            "scrollbar-thin [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800/50 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full"
          )}
          style={{ overflowAnchor: "none", scrollBehavior: "auto" }}
          role="log"
        >
          {children}
        </div>
      </div>
    </StickToBottomContext.Provider>
  );
};

export type ConversationContentProps = HTMLAttributes<HTMLDivElement>;

export const ConversationContent = ({
  className,
  children,
  ...props
}: ConversationContentProps) => (
  <div
    className={className}
    {...props}
  >
    <div className="flex flex-col gap-8 p-4">
      {children}
    </div>
  </div>
);

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full z-10 shadow-md",
          className
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};
