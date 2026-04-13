#!/usr/bin/env npx tsx
/**
 * Seed only rex_inbound_emails (+ optional extractions / attachments from factories).
 *
 * Usage:
 *   npm run db:seed:emails
 *   npm run db:seed:emails -- --emails 20
 *   npm run db:seed:emails -- --append --emails 10
 *   npm run db:seed:emails -- --seed 4242
 */

import { parseArgs } from "node:util";
import { seedInboundEmails } from "./emailSeed";
import { createServiceSupabase } from "./env";
import { faker } from "@faker-js/faker";

function parsePositiveInt(raw: string | undefined, flag: string): number {
  const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || String(n) !== raw?.trim()) {
    throw new Error(`Invalid ${flag}: expected a non-negative integer, got "${raw}".`);
  }
  return n;
}

function printHelp(): void {
  console.log(`db:seed:emails — fill rex_inbound_emails (and related rows) with Faker data.

Options:
  --emails, -e     Number of inbound email rows (default: 10)
  --append, -a     Do not delete existing inbound emails before insert
  --seed           Faker seed for reproducible runs (number)
  --help, -h       Show this message

Examples:
  npm run db:seed:emails -- --emails 25
  npm run db:seed:emails -- --append --emails 5
`);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      emails: { type: "string", short: "e", default: "10" },
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

  const count = parsePositiveInt(values.emails, "--emails");
  const fakerSeed =
    values.seed !== undefined ? parsePositiveInt(values.seed, "--seed") : undefined;

  if (fakerSeed !== undefined) {
    faker.seed(fakerSeed);
  }

  const supabase = createServiceSupabase();

  const { emails, extractions, attachments } = await seedInboundEmails(supabase, {
    count,
    append: values.append,
  });

  console.log(
    `Seeded ${emails.length} inbound emails (${extractions.length} extractions, ${attachments.length} attachments).` +
      (values.append ? " (append mode)" : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
