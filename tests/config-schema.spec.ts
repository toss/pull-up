import { readFile } from 'node:fs/promises';

describe('generated config schema', () => {
  it('describes job mappings and their fields for YAML editors', async () => {
    const schema = JSON.parse(await readFile(new URL('../schema.json', import.meta.url), 'utf8'));

    expect(schema).toMatchObject({
      type: 'object',
      properties: {
        jobs: {
          type: 'object',
          propertyNames: {
            type: 'string',
            not: { enum: ['constructor', 'prototype', '__proto__'] },
          },
          additionalProperties: {
            type: 'object',
            properties: {
              type: { const: 'codeowners' },
              input: { type: 'array', items: { type: 'string' } },
              output: { type: 'string' },
            },
            required: ['type'],
            additionalProperties: false,
          },
        },
      },
      required: ['jobs'],
      additionalProperties: false,
    });
  });
});
