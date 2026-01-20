import type { Rule } from "./types";

export function defineRule<Args extends any[]>(rule: (...args: Args) => Rule) {
  return rule;
}
