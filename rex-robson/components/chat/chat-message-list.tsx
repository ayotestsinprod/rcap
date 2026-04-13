export type ChatMessage = {
  id: string;
  role: "user" | "rex";
  text: string;
};

type ChatMessageListProps = {
  messages: ChatMessage[];
};

export function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-8">
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <div
              className="max-w-[min(85%,28rem)] rounded-2xl rounded-br-md bg-charcoal px-4 py-2.5 text-[15px] leading-relaxed text-cream"
              role="article"
              aria-label="You"
            >
              {m.text}
            </div>
          </div>
        ) : (
          <div key={m.id} className="flex justify-start">
            <div
              className="max-w-[min(85%,28rem)] rounded-2xl rounded-bl-md bg-muted/90 px-4 py-2.5 text-[15px] leading-relaxed text-charcoal"
              role="article"
              aria-label="Rex"
            >
              {m.text}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
