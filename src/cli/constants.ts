import { codeownersRule, type Rule } from "../core";

export const defaultRules: { [key: string]: Rule } = {
  codeowners: codeownersRule(),
};
