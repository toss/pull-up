import { readFile } from 'node:fs/promises';

describe('generated config schema', () => {
  it('describes job mappings and their fields for YAML editors', async () => {
    const schema = JSON.parse(await readFile(new URL('../schema.json', import.meta.url), 'utf8'));

    expect(schema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "jobs": {
            "additionalProperties": {
              "anyOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "input": {
                      "description": "Input file paths for the job",
                      "examples": [
                        [
                          "**/CODEOWNERS",
                          "!**/fixtures/**",
                        ],
                      ],
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "output": {
                      "description": "Output file path for the job",
                      "examples": [
                        "CODEOWNERS",
                        ".github/CODEOWNERS",
                        "docs/CODEOWNERS",
                      ],
                      "type": "string",
                    },
                    "type": {
                      "const": "codeowners",
                    },
                  },
                  "required": [
                    "type",
                  ],
                  "type": "object",
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "command": {
                      "description": "The command to run for the custom job",
                      "examples": [
                        "node scripts/generate-codeowners.js",
                        "python scripts/generate-codeowners.py",
                      ],
                      "minLength": 1,
                      "type": "string",
                    },
                    "input": {
                      "description": "Input file paths for the job",
                      "examples": [
                        [
                          "**/CODEOWNERS",
                          "!**/fixtures/**",
                        ],
                      ],
                      "items": {
                        "type": "string",
                      },
                      "type": "array",
                    },
                    "output": {
                      "description": "Output file path for the job",
                      "examples": [
                        "CODEOWNERS",
                        ".github/CODEOWNERS",
                        "docs/CODEOWNERS",
                      ],
                      "minLength": 1,
                      "type": "string",
                    },
                    "type": {
                      "const": "custom",
                    },
                  },
                  "required": [
                    "type",
                    "command",
                    "output",
                  ],
                  "type": "object",
                },
              ],
            },
            "propertyNames": {
              "not": {
                "enum": [
                  "constructor",
                  "prototype",
                  "__proto__",
                ],
              },
              "type": "string",
            },
            "type": "object",
          },
        },
        "required": [
          "jobs",
        ],
        "type": "object",
      }
    `);
  });
});
