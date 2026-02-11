import { nanoid } from "nanoid";

export function generateId(): string {
  return nanoid(8);
}

export function generateShareCode(): string {
  return nanoid(22);
}
