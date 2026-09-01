const test = require('node:test');
const assert = require('node:assert/strict');

const { extractGeminiText, parseGeminiJsonResponse } = require('../api/gemini.js');
const { clampResumePageCount } = require('../static/js/resumePageUtils.js');

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

test('resume page count stays within 1 to 2 pages', () => {
  assert.equal(clampResumePageCount(0.8), 1);
  assert.equal(clampResumePageCount(1.2), 2);
  assert.equal(clampResumePageCount(3.2), 2);
  assert.equal(clampResumePageCount(0), 1);
});
