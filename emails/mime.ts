import { Buffer } from "node:buffer";

export type EmailMimeInput = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  date?: string;
  messageId?: string;
  extraHeaders?: Record<string, string>;
};

function encodeHeader(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function normalizeCrlf(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/\r\n?$/g, "");
}

export function buildMultipartAlternativeEml(input: EmailMimeInput) {
  const boundary = `=_xpansive_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    ...(input.replyTo ? [`Reply-To: ${input.replyTo}`] : []),
    `Subject: ${encodeHeader(input.subject)}`,
    "Date: " + (input.date ?? new Date().toUTCString()),
    ...(input.messageId ? [`Message-ID: ${input.messageId}`] : []),
    ...(Object.entries(input.extraHeaders ?? {}).map(([name, value]) => `${name}: ${value}`)),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeCrlf(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeCrlf(input.html),
    `--${boundary}--`,
  ];
  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}\r\n`;
}
