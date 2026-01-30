import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";

export function generateId(): string {
  return nanoid(8);
}

const SHARE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SHARE_CODE_LENGTH = 6;

export function generateShareCode(): string {
  const bytes = randomBytes(SHARE_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += SHARE_CODE_CHARS[bytes[i] % SHARE_CODE_CHARS.length];
  }
  return code;
}
