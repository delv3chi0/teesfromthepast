// Robust, Chrome-safe image download helper.
// Works with Cloudinary URLs (adds fl_attachment) and data URLs.
export async function downloadImage(url, filename = 'image.png') {
  try {
    if (!url) throw new Error('No URL');

    // Encourage "Save As" for Cloudinary-hosted files
    const preparedUrl =
      url.includes('res.cloudinary.com') && url.includes('/upload/')
        ? url.replace('/upload/', '/upload/fl_attachment/')
        : url;

    // fetch works for http(s) and data: URLs in modern browsers
    const res = await fetch(preparedUrl, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error('Download failed:', err);
    // Fallback: last-ditch navigation
    try { window.location.href = url; } catch {}
  }
}
