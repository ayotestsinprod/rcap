#!/usr/bin/env npx tsx

import { parseArgs } from "node:util";
import { faker } from "@faker-js/faker";
import { createServiceSupabase } from "./env";
import { seedRexTasks } from "./taskSeed";

function parsePositiveInt(raw: string | undefined, flag: string): number {
  const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || String(n) !== raw?.trim()) {
    throw new Error(`Invalid ${flag}: expected a non-negative integer, got "${raw}".`);
  }
  return n;
}

function printHelp(): void {
  console.log(`db:seed:tasks — fill rex_tasks with Faker data.

Options:
  --tasks, -t      Number of Rex task rows (default: 12)
  --append, -a     Do not delete existing rex_tasks before insert
  --seed           Faker seed for reproducible runs (number)
  --help, -h       Show this message
`);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      tasks: { type: "string", short: "t", default: "12" },
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

  const count = parsePositiveInt(values.tasks, "--tasks");
  const fakerSeed =
    values.seed !== undefined ? parsePositiveInt(values.seed, "--seed") : undefined;
  if (fakerSeed !== undefined) faker.seed(fakerSeed);

  const supabase = createServiceSupabase();
  const rows = await seedRexTasks(supabase, {
    count,
    append: values.append,
  });
  console.log(
    `Seeded ${rows.length} rex tasks.` + (values.append ? " (append mode)" : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
