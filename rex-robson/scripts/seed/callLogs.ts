#!/usr/bin/env npx tsx

import { parseArgs } from "node:util";
import { faker } from "@faker-js/faker";
import { createServiceSupabase } from "./env";
import { seedCallLogs } from "./callLogSeed";

function parsePositiveInt(raw: string | undefined, flag: string): number {
  const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || String(n) !== raw?.trim()) {
    throw new Error(`Invalid ${flag}: expected a non-negative integer, got "${raw}".`);
  }
  return n;
}

function printHelp(): void {
  console.log(`db:seed:call-logs — fill rex_inbound_emails with meeting-note/transcript style rows.

Options:
  --call-logs, -l  Number of call-log rows (default: 10)
  --append, -a     Do not delete existing inbound emails before insert
  --seed           Faker seed for reproducible runs (number)
  --help, -h       Show this message
`);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "call-logs": { type: "string", short: "l", default: "10" },
      append: { type: "boolean", short: "a", default: false },
      seed: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help || positionals.includes("help")) {
    printHelp();
    return;
  }

  const count = parsePositiveInt(values["call-logs"], "--call-logs");
  const fakerSeed =
    values.seed !== undefined ? parsePositiveInt(values.seed, "--seed") : undefined;
  if (fakerSeed !== undefined) faker.seed(fakerSeed);

  const supabase = createServiceSupabase();
  const { emails, extractions, attachments } = await seedCallLogs(supabase, {
    count,
    append: values.append,
  });

  console.log(
    `Seeded ${emails.length} call logs (${extractions.length} extractions, ${attachments.length} attachments).` +
      (values.append ? " (append mode)" : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
