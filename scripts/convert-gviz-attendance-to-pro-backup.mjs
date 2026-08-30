#!/usr/bin/env node
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const ITERATIONS = 240_000;
const VALID_STATUSES = new Set(['Pending', 'Office', 'WFH', 'Day Off', 'First Half Off', 'Second Half Off']);

const args = parseArgs(process.argv.slice(2));
if (!args.input && !args.url) {
  fail('Provide --input pasted-response.txt or --url "https://docs.google.com/.../gviz/..."');
}

const source = args.input ? await readFile(resolve(args.input), 'utf8') : await fetchText(args.url);
const rows = parseGvizRows(source);
const conversion = convertRows(rows);
const records = conversion.records;
const snapshot = { records };
const output = resolve(args.output ?? defaultOutput(args.passphrase));

await mkdir(dirname(output), { recursive: true });
if (args.passphrase) {
  await writeFile(output, JSON.stringify(encryptSnapshot(snapshot, args.passphrase), null, 2));
} else {
  await writeFile(output, JSON.stringify(snapshot, null, 2));
}

console.log(`Converted ${records.length} attendance record${records.length === 1 ? '' : 's'}.`);
if (conversion.skipped)
  console.log(`Skipped ${conversion.skipped} row${conversion.skipped === 1 ? '' : 's'} without entry data.`);
console.log(`Created: ${output}`);
if (!args.passphrase) {
  console.log('Plain JSON snapshots can be restored from Settings. Use --passphrase when you want an encrypted file.');
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith('--')) fail(`Unknown argument: ${key}`);
    const name = key.slice(2);
    const value = values[index + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for ${key}`);
    parsed[name] = value;
    index += 1;
  }
  return parsed;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) fail(`Unable to fetch API response: ${response.status} ${response.statusText}`);
  return response.text();
}

function parseGvizRows(text) {
  const jsonText = text
    .trim()
    .replace(/^\/\*O_o\*\/\s*/, '')
    .replace(/^google\.visualization\.Query\.setResponse\(/, '')
    .replace(/\);\s*$/, '');
  const parsed = JSON.parse(jsonText);
  const rows = parsed?.table?.rows;
  if (!Array.isArray(rows)) fail('GViz response does not contain table rows.');
  return rows;
}

function toRecord(row, index) {
  const cells = Array.isArray(row?.c) ? row.c : [];
  const entryTime = parseGvizDate(cells[1]);
  const exitTime = parseGvizDate(cells[2]);
  const status = normalizeStatus(cellValue(cells[5]));
  if (!entryTime && status !== 'Day Off') return null;

  const createdAt = parseGvizDate(cells[0]) ?? entryTime ?? exitTime ?? new Date();
  const date = localDate(entryTime ?? exitTime ?? createdAt);
  const companyName = stringOrUndefined(cellValue(cells[3]));
  const comments = stringOrUndefined(cellValue(cells[4]));
  const id = `sheet-${date}-${String(index + 1).padStart(4, '0')}`;

  return {
    id,
    date,
    entryTime: status === 'Day Off' ? undefined : entryTime?.toISOString(),
    exitTime: status === 'Day Off' ? undefined : exitTime?.toISOString(),
    status,
    companyName,
    comments,
    workHours: 6,
    submitted: true,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  };
}

function convertRows(rows) {
  const records = [];
  let skipped = 0;
  const seen = new Set();

  rows.forEach((row, index) => {
    const record = toRecord(row, index);
    if (!record) {
      skipped += 1;
      return;
    }

    const duplicateKey = [
      record.date,
      record.status,
      record.entryTime ?? '',
      record.exitTime ?? '',
      record.companyName ?? '',
      record.comments ?? '',
    ].join('|');
    if (seen.has(duplicateKey)) return;

    seen.add(duplicateKey);
    records.push(record);
  });

  return { records, skipped };
}

function parseGvizDate(cell) {
  const value = cellValue(cell);
  if (typeof value !== 'string') return null;
  const match = value.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
  if (match) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
    return new Date(Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second));
  }
  const fallback = new Date(cell?.f ?? value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function cellValue(cell) {
  return cell && typeof cell === 'object' && 'v' in cell ? cell.v : undefined;
}

function normalizeStatus(value) {
  const status = stringOrUndefined(value) ?? 'Office';
  return VALID_STATUSES.has(status) ? status : 'Office';
}

function stringOrUndefined(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function encryptSnapshot(snapshot, passphrase) {
  if (passphrase.length < 8) fail('Passphrase must be at least 8 characters to match app restore rules.');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(passphrase, salt, ITERATIONS, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(snapshot), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    format: 'office-pulse-attendance-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    iterations: ITERATIONS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: Buffer.concat([ciphertext, tag]).toString('base64'),
  };
}

function defaultOutput(encrypted) {
  const date = localDate(new Date());
  return `releases/google-sheet-attendance-${date}.${encrypted ? 'officepulse' : 'json'}`;
}

function fail(message) {
  console.error(`Error: ${message}`);
  console.error(
    `Example: node ${basename(process.argv[1])} --input pasted-response.txt --passphrase "your passphrase"`,
  );
  process.exit(1);
}
