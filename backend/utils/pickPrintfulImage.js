export function pickPrintfulImage(files = []) {
  const byType = (t) =>
    files.find(f => f?.type === t && (f.preview_url || f.url || f.thumbnail_url));

  const candidates = [
    byType("preview"),
    byType("mockup"),
    files.find(f => f?.preview_url),
    files.find(f => f?.url),
    files.find(f => f?.thumbnail_url),
    files[0]
  ].filter(Boolean);

  const f = candidates[0];
  return f?.preview_url || f?.url || f?.thumbnail_url || null;
}
