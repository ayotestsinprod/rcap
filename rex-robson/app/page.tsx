import { ChatShell } from "@/components/chat";
import { getRexDashboardStats } from "@/lib/data/dashboard-counts";
import { buildRexOpeningGreeting } from "@/lib/rex/voice";

export default async function Home() {
  const stats = await getRexDashboardStats();
  const openingGreeting = buildRexOpeningGreeting(stats);

  return <ChatShell openingGreeting={openingGreeting} stats={stats} />;
}
