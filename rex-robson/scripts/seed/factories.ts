import { faker } from "@faker-js/faker";
import { randomUUID } from "node:crypto";

const ORG_TYPES = [
  "fund",
  "family_office",
  "advisor",
  "corporate",
  "endowment",
] as const;

const CONTACT_DEAL_TYPES = [
  "growth_equity",
  "venture",
  "buyout",
  "co_invest",
  "secondaries",
  "m_and_a",
  "private_placement",
  "credit",
] as const;

const SECTORS = [
  "saas",
  "fintech",
  "healthcare_it",
  "industrials",
  "logistics",
  "business_services",
  "consumer",
  "energy",
  "real_estate",
] as const;

const SOURCES = [
  "conference",
  "linkedin",
  "referral",
  "event",
  "inbound",
  "warm_intro",
] as const;

const ROLES = [
  "Partner",
  "Principal",
  "Managing Director",
  "Director",
  "Vice President",
  "Associate",
  "Analyst",
] as const;

const DEAL_STRUCTURES = [
  "Series A preferred",
  "Series B preferred",
  "majority_recap",
  "minority_growth",
  "buyout",
  "secondary",
  "credit_facility",
  "structured_equity",
] as const;

const DEAL_STATUSES = [
  "sourcing",
  "diligence",
  "ioi",
  "live",
  "passed",
  "closed",
] as const;

function pickMany<T extends readonly string[]>(
  pool: T,
  min: number,
  max: number,
): string[] {
  const n = faker.number.int({ min, max });
  return faker.helpers.arrayElements([...pool], n);
}

function pickOne<T extends readonly string[]>(pool: T): string {
  return faker.helpers.arrayElement([...pool]);
}

export type OrganisationRow = {
  id: string;
  name: string;
  type: string;
  description: string;
};

export type ContactRow = {
  name: string;
  organisation_id: string;
  role: string;
  deal_types: string[];
  min_deal_size: number | null;
  max_deal_size: number | null;
  sectors: string[];
  geography: string;
  relationship_score: number;
  last_contact_date: string;
  notes: string;
  source: string;
};

export type DealRow = {
  title: string;
  size: number;
  sector: string;
  structure: string;
  status: string;
  notes: string;
};

export function createOrganisations(num: number): OrganisationRow[] {
  const rows: OrganisationRow[] = [];
  for (let i = 0; i < num; i++) {
    const label = faker.company.name();
    rows.push({
      id: randomUUID(),
      name: `${label} ${faker.helpers.arrayElement(["Capital", "Partners", "Holdings", "Group", "Advisors"])}`,
      type: pickOne(ORG_TYPES),
      description: faker.company.catchPhrase(),
    });
  }
  return rows;
}

export function createContacts(
  organisations: OrganisationRow[],
  num: number,
): ContactRow[] {
  if (organisations.length === 0) {
    throw new Error("createContacts requires at least one organisation.");
  }
  const rows: ContactRow[] = [];
  for (let i = 0; i < num; i++) {
    const org = organisations[i % organisations.length]!;
    const hasRange = faker.datatype.boolean({ probability: 0.85 });
    let min_deal_size: number | null = null;
    let max_deal_size: number | null = null;
    if (hasRange) {
      const minM = faker.number.int({ min: 1, max: 40 });
      const span = faker.number.int({ min: 5, max: 80 });
      min_deal_size = minM * 1_000_000;
      max_deal_size = (minM + span) * 1_000_000;
    }
    rows.push({
      name: faker.person.fullName(),
      organisation_id: org.id,
      role: pickOne(ROLES),
      deal_types: pickMany(CONTACT_DEAL_TYPES, 1, 3),
      min_deal_size,
      max_deal_size,
      sectors: pickMany(SECTORS, 1, 3),
      geography: faker.location.country(),
      relationship_score: Number(faker.number.float({ min: 0.35, max: 0.99, fractionDigits: 2 })),
      last_contact_date: faker.date
        .recent({ days: 365 })
        .toISOString()
        .slice(0, 10),
      notes: faker.lorem.sentence({ min: 8, max: 24 }),
      source: pickOne(SOURCES),
    });
  }
  return rows;
}

export function createDeals(num: number): DealRow[] {
  const rows: DealRow[] = [];
  for (let i = 0; i < num; i++) {
    const company = faker.company.name();
    const theme = faker.helpers.arrayElement([
      "platform recapitalization",
      "growth financing",
      "buyout",
      "co-invest opportunity",
      "carve-out",
    ]);
    rows.push({
      title: `${company} — ${theme}`,
      size: faker.number.int({ min: 5, max: 250 }) * 1_000_000,
      sector: pickOne(SECTORS),
      structure: pickOne(DEAL_STRUCTURES),
      status: pickOne(DEAL_STATUSES),
      notes: faker.lorem.sentences({ min: 1, max: 3 }),
    });
  }
  return rows;
}
