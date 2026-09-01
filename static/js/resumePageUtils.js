function clampResumePageCount(pageCount) {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return 1;
  return Math.min(2, Math.max(1, Math.ceil(pageCount)));
}

function getA4PdfPageMetrics({
  contentWidthPx = 794,
  pageWidthMm = 210,
  pageHeightMm = 297,
  topMarginMm = 0,
  bottomMarginMm = 12.7
} = {}) {
  const cssPageHeightPx = contentWidthPx * (pageHeightMm / pageWidthMm);
  const cssTopMarginPx = contentWidthPx * (topMarginMm / pageWidthMm);
  const cssBottomMarginPx = contentWidthPx * (bottomMarginMm / pageWidthMm);

  return {
    contentWidthPx,
    pageWidthMm,
    pageHeightMm,
    topMarginMm,
    bottomMarginMm,
    cssPageHeightPx,
    cssTopMarginPx,
    cssBottomMarginPx,
    cssPrintableHeightPx: cssPageHeightPx - cssTopMarginPx - cssBottomMarginPx,
    pdfPrintableHeightMm: pageHeightMm - topMarginMm - bottomMarginMm
  };
}

function getPdfCanvasPageSliceHeight(canvasWidth, options = {}) {
  const metrics = getA4PdfPageMetrics(options);
  const rasterScale = canvasWidth / metrics.contentWidthPx;
  return Math.round(metrics.cssPrintableHeightPx * rasterScale);
}

function prepareResumeForPrintLayout(contentRoot, firstPageMetrics, secondPageMetrics) {
  if (!contentRoot) {
    return { contentHeightPx: firstPageMetrics.cssPrintableHeightPx, pageCount: 1 };
  }

  contentRoot.style.height = 'auto';
  contentRoot.style.minHeight = '0';
  contentRoot.style.overflow = 'visible';
  contentRoot.style.paddingTop = '0';
  contentRoot.style.paddingLeft = '0';
  contentRoot.style.paddingRight = '0';

  let contentHeightPx = Math.max(contentRoot.scrollHeight, contentRoot.offsetHeight);
  const maximumContentHeightPx = firstPageMetrics.cssPrintableHeightPx + secondPageMetrics.cssPrintableHeightPx;

  if (contentHeightPx > maximumContentHeightPx) {
    const scale = maximumContentHeightPx / contentHeightPx;
    contentRoot.style.width = `${firstPageMetrics.contentWidthPx / scale}px`;
    contentRoot.style.transform = `scale(${scale})`;
    contentRoot.style.transformOrigin = 'top left';
    contentHeightPx = Math.min(
      maximumContentHeightPx,
      Math.ceil(Math.max(contentRoot.scrollHeight, contentRoot.offsetHeight) * scale)
    );
  }

  return {
    contentHeightPx,
    pageCount: contentHeightPx > firstPageMetrics.cssPrintableHeightPx ? 2 : 1
  };
}

function renderResumePrintPreview(target, resumeHtml, options = {}) {
  if (!target) return { pageCount: 1, totalHeightPx: 0 };

  const firstPageMetrics = getA4PdfPageMetrics(options);
  const secondPageMetrics = getA4PdfPageMetrics({
    ...options,
    topMarginMm: options.secondPageTopMarginMm ?? 12.7
  });

  target.innerHTML = resumeHtml;
  const contentRoot = target.firstElementChild;
  const layout = prepareResumeForPrintLayout(contentRoot, firstPageMetrics, secondPageMetrics);
  const createPage = (sourceTopPx, pageMetrics) => {
    const page = document.createElement('div');
    page.className = 'print-preview-page';
    page.style.width = `${pageMetrics.contentWidthPx}px`;
    page.style.height = `${pageMetrics.cssPageHeightPx}px`;
    page.style.position = 'relative';
    page.style.overflow = 'hidden';
    page.style.background = '#ffffff';
    page.style.flex = '0 0 auto';

    const pageContent = contentRoot.cloneNode(true);
    pageContent.style.position = 'absolute';
    pageContent.style.left = '0';
    pageContent.style.top = `${sourceTopPx}px`;
    page.appendChild(pageContent);
    return page;
  };

  target.innerHTML = '';
  target.style.width = `${firstPageMetrics.contentWidthPx}px`;
  target.style.background = '#e2e8f0';
  target.style.display = 'flex';
  target.style.flexDirection = 'column';
  target.style.gap = '16px';
  target.appendChild(createPage(0, firstPageMetrics));

  if (layout.pageCount === 2) {
    const secondPageSourceTop = secondPageMetrics.cssTopMarginPx - firstPageMetrics.cssPrintableHeightPx;
    target.appendChild(createPage(secondPageSourceTop, secondPageMetrics));
  }

  return {
    pageCount: layout.pageCount,
    totalHeightPx: firstPageMetrics.cssPageHeightPx
      + (layout.pageCount === 2 ? secondPageMetrics.cssPageHeightPx + 16 : 0)
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    clampResumePageCount,
    getA4PdfPageMetrics,
    getPdfCanvasPageSliceHeight,
    prepareResumeForPrintLayout,
    renderResumePrintPreview
  };
}
