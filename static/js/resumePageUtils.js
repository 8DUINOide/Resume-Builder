function clampResumePageCount(pageCount) {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return 1;
  return Math.min(2, Math.max(1, Math.ceil(pageCount)));
}

function getA4PdfPageMetrics({
  contentWidthPx = 794,
  pageWidthMm = 210,
  pageHeightMm = 297,
  bottomMarginMm = 12.7
} = {}) {
  const cssPageHeightPx = contentWidthPx * (pageHeightMm / pageWidthMm);
  const cssBottomMarginPx = contentWidthPx * (bottomMarginMm / pageWidthMm);

  return {
    contentWidthPx,
    pageWidthMm,
    pageHeightMm,
    bottomMarginMm,
    cssPageHeightPx,
    cssPrintableHeightPx: cssPageHeightPx - cssBottomMarginPx,
    pdfPrintableHeightMm: pageHeightMm - bottomMarginMm
  };
}

function getPdfCanvasPageSliceHeight(canvasWidth, options = {}) {
  const metrics = getA4PdfPageMetrics(options);
  const rasterScale = canvasWidth / metrics.contentWidthPx;
  return Math.round(metrics.cssPrintableHeightPx * rasterScale);
}

if (typeof module !== 'undefined') {
  module.exports = {
    clampResumePageCount,
    getA4PdfPageMetrics,
    getPdfCanvasPageSliceHeight
  };
}
