function clampResumePageCount(pageCount) {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return 1;
  return Math.min(2, Math.max(1, Math.ceil(pageCount)));
}

if (typeof module !== 'undefined') {
  module.exports = { clampResumePageCount };
}
