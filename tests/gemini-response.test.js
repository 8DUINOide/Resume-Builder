const test = require('node:test');
const assert = require('node:assert/strict');

const { extractGeminiText, parseGeminiJsonResponse } = require('../api/gemini.js');

test('extractGeminiText reads text from Gemini response parts', () => {
  const response = {
    candidates: [{
      content: {
        parts: [
          { text: 'first response' },
          { text: 'second response' }
        ]
      }
    }]
  };

  assert.equal(extractGeminiText(response), 'first response\nsecond response');
});

test('parseGeminiJsonResponse strips markdown fences and parses JSON', () => {
  const response = {
    candidates: [{
      content: {
        parts: [{ text: '```json\n{"personalInfo":{"fullName":"Jane Doe"}}\n```' }]
      }
    }]
  };

  assert.deepEqual(parseGeminiJsonResponse(response), { personalInfo: { fullName: 'Jane Doe' } });
});
