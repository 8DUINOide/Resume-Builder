const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { extractGeminiText, parseGeminiJsonResponse } = require('../api/gemini.js');
const {
  clampResumePageCount,
  getA4PdfPageMetrics,
  getPdfCanvasPageSliceHeight,
  prepareResumeForPrintLayout
} = require('../static/js/resumePageUtils.js');

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

test('PDF slices use no side margins and reserve a 0.5-inch second-page top margin', () => {
  const metrics = getA4PdfPageMetrics();
  const secondPageMetrics = getA4PdfPageMetrics({ topMarginMm: 12.7 });
  const sliceHeight = getPdfCanvasPageSliceHeight(1588);
  const secondPageSliceHeight = getPdfCanvasPageSliceHeight(1588, { topMarginMm: 12.7 });

  assert.equal(metrics.bottomMarginMm, 12.7);
  assert.equal(metrics.topMarginMm, 0);
  assert.equal(secondPageMetrics.topMarginMm, 12.7);
  assert.ok(Math.abs(metrics.cssPageHeightPx - 1123) < 1);
  assert.ok(Math.abs(metrics.cssPrintableHeightPx - 1075) < 1);
  assert.equal(sliceHeight, Math.round(metrics.cssPrintableHeightPx * 2));
  assert.equal(secondPageSliceHeight, Math.round(secondPageMetrics.cssPrintableHeightPx * 2));
  assert.ok(secondPageSliceHeight < sliceHeight);
});

test('print preview layout removes first-page template margins and caps output at two pages', () => {
  const firstPageMetrics = getA4PdfPageMetrics();
  const secondPageMetrics = getA4PdfPageMetrics({ topMarginMm: 12.7 });
  const contentRoot = {
    style: {},
    scrollHeight: 3000,
    offsetHeight: 3000
  };

  const layout = prepareResumeForPrintLayout(contentRoot, firstPageMetrics, secondPageMetrics);

  assert.equal(contentRoot.style.paddingTop, '0');
  assert.equal(contentRoot.style.paddingLeft, '0');
  assert.equal(contentRoot.style.paddingRight, '0');
  assert.equal(layout.pageCount, 2);
  assert.ok(layout.contentHeightPx <= firstPageMetrics.cssPrintableHeightPx + secondPageMetrics.cssPrintableHeightPx);
});

test('pdf export wrapper stays visible so captured content is not blank', () => {
  const adminJs = fs.readFileSync(path.join(__dirname, '../static/js/admin.js'), 'utf8');
  const templatesJs = fs.readFileSync(path.join(__dirname, '../static/js/templates.js'), 'utf8');

  const body = {
    children: [],
    appendChild(node) { this.children.push(node); return node; }
  };

  const createElement = () => ({
    style: {},
    innerHTML: '',
    appendChild(node) { this.child = node; return node; },
    remove() {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}
  });

  const makeDomElement = (id = '') => ({
    id,
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    appendChild(node) { this.child = node; return node; },
    addEventListener() {},
    remove() {},
    click() {}
  });

  const context = {
    document: {
      body,
      createElement,
      getElementById(id) { return makeDomElement(id); },
      querySelectorAll() { return []; },
      querySelector() { return null; }
    },
    firebase: {
      apps: [],
      initializeApp() {},
      auth() {
        return {
          onAuthStateChanged() {},
          signInWithPopup() { return Promise.resolve(); },
          signOut() { return Promise.resolve(); }
        };
      },
      firestore() {
        return {
          collection() {
            return {
              doc() {
                return {
                  get: async () => ({ exists: false, data: () => ({}) }),
                  set: async () => {},
                  update: async () => {},
                  delete: async () => {}
                };
              },
              orderBy() {
                return { onSnapshot() { return () => {}; } };
              }
            };
          }
        };
      }
    },
    ResumeTemplates: {
      render() {
        return '<div style="width:794px;min-height:1123px;">Resume content</div>';
      }
    },
    console,
    requestAnimationFrame(fn) { fn(); return 1; }
  };

  vm.runInNewContext(templatesJs, context);
  vm.runInNewContext(adminJs, context);

  const buildPdfExportNode = context.buildPdfExportNode;
  assert.ok(typeof buildPdfExportNode === 'function');

  const result = buildPdfExportNode({
    refId: 'REF-1234',
    templateType: 'ats_classic',
    resumeData: {
      personalInfo: { fullName: 'Jane Doe' },
      summary: 'Example summary',
      experience: [],
      education: [],
      skills: [],
      projects: []
    }
  });

  assert.ok(result);
  assert.equal(result.wrapper.style.left, '0');
  assert.equal(result.wrapper.style.visibility, 'visible');
  assert.equal(result.exportNode.style.visibility, 'visible');
  assert.equal(result.exportNode.style.display, 'block');
  assert.ok(result.exportNode.innerHTML.length > 0);
  assert.ok(fs.readFileSync(path.join(__dirname, '../static/js/resumePageUtils.js'), 'utf8').includes("contentRoot.style.paddingTop = '0'"));
});

test('customer preview uses the same paginated print renderer as admin', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');
  const adminJs = fs.readFileSync(path.join(__dirname, '../static/js/admin.js'), 'utf8');

  assert.ok(appJs.includes('renderResumePrintPreview(inner, html)'));
  assert.ok(adminJs.includes('renderResumePrintPreview(adminPreviewInner, html)'));
  assert.ok(appJs.includes("container.style.overflow = 'visible'"));
});
