"use client";

import { useMemo, useState } from "react";
import type { RexDashboardStats } from "@/lib/rex/voice";
import {
  rexEmptyContacts,
  rexEmptyDealCanvas,
  rexEmptyOrganisations,
  rexEmptySuggestions,
  rexEmptyUpload,
} from "@/lib/rex/voice";
import { ChatComposer } from "./chat-composer";
import { ChatMessageList, type ChatMessage } from "./chat-message-list";
import { ChatSidebar, type ChatNavId } from "./chat-sidebar";

type ChatShellProps = {
  openingGreeting: string;
  stats: RexDashboardStats;
};

function RexVoicePanel({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8">
      <h2 className="font-serif text-xl tracking-tight text-charcoal">
        {title}
      </h2>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-charcoal-light">
        {message}
      </p>
    </div>
  );
}

function RexStubPanel({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8">
      <h2 className="font-serif text-xl tracking-tight text-charcoal">
        {title}
      </h2>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-charcoal-light">
        You’ve got data here — list view is next. Ask me in chat if you need anything now.
      </p>
    </div>
  );
}

export function ChatShell({ openingGreeting, stats }: ChatShellProps) {
  const [activeNav, setActiveNav] = useState<ChatNavId>("ask");

  const initialMessages = useMemo<ChatMessage[]>(
    () => [
      {
        id: "rex-open",
        role: "rex",
        text: openingGreeting,
      },
    ],
    [openingGreeting],
  );

  return (
    <div className="flex min-h-[100dvh] flex-1 bg-cream">
      <ChatSidebar activeId={activeNav} onNavigate={setActiveNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-charcoal/[0.08] bg-cream-light/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="relative shrink-0">
            <div
              className="flex size-9 items-center justify-center rounded-full bg-charcoal font-sans text-xs font-semibold tracking-tight text-cream"
              aria-hidden
            >
              RX
            </div>
            <span
              className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-cream-light bg-emerald-500"
              title="Online"
              aria-label="Online"
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg tracking-tight text-charcoal">
              Rex
            </h1>
            <p className="text-xs text-charcoal-light/80">Online</p>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">
          {activeNav === "ask" ? (
            <>
              <ChatMessageList messages={initialMessages} />
              <ChatComposer />
            </>
          ) : activeNav === "contacts" ? (
            stats.contactCount === 0 ? (
              <RexVoicePanel title="Contacts" message={rexEmptyContacts} />
            ) : (
              <RexStubPanel title="Contacts" />
            )
          ) : activeNav === "organisations" ? (
            stats.organisationCount === 0 ? (
              <RexVoicePanel
                title="Organisations"
                message={rexEmptyOrganisations}
              />
            ) : (
              <RexStubPanel title="Organisations" />
            )
          ) : activeNav === "deal-canvas" ? (
            stats.openDealCount === 0 ? (
              <RexVoicePanel title="Deal Canvas" message={rexEmptyDealCanvas} />
            ) : (
              <RexStubPanel title="Deal Canvas" />
            )
          ) : activeNav === "suggestions" ? (
            stats.suggestionTotalCount === 0 ? (
              <RexVoicePanel title="Suggestions" message={rexEmptySuggestions} />
            ) : (
              <RexStubPanel title="Suggestions" />
            )
          ) : (
            <RexVoicePanel title="Upload & Import" message={rexEmptyUpload} />
          )}
        </main>
      </div>
    </div>
  );
}
