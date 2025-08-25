// backend/queues/processors/sitemapProcessor.js
import fs from 'fs/promises';
import path from 'path';

export async function processSitemapJob(job) {
  console.log(`[SitemapProcessor] Regenerating sitemap`);

  try {
    // In a real implementation, you would:
    // 1. Query all products from the database
    // 2. Query all public designs
    // 3. Generate XML sitemap
    // 4. Save to public directory or upload to CDN

    const sitemap = await generateSitemapXML();
    
    // For now, just log the sitemap content
    if (process.env.NODE_ENV === 'development') {
      console.log('[SitemapProcessor] Generated sitemap (preview):');
      console.log(sitemap.substring(0, 500) + '...');
    }
    
    // In production, save to file or upload
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    
    try {
      await fs.mkdir(path.dirname(sitemapPath), { recursive: true });
      await fs.writeFile(sitemapPath, sitemap, 'utf8');
      console.log(`[SitemapProcessor] Sitemap saved to ${sitemapPath}`);
    } catch (error) {
      console.log(`[SitemapProcessor] Could not save sitemap file (${error.message}), but generation completed`);
    }
    
    return { 
      success: true, 
      generatedAt: new Date().toISOString(),
      urlCount: countUrlsInSitemap(sitemap)
    };
    
  } catch (error) {
    console.error(`[SitemapProcessor] Failed to generate sitemap:`, error.message);
    throw error;
  }
}

async function generateSitemapXML() {
  const baseUrl = process.env.FRONTEND_URL || 'https://teesfromthepast.vercel.app';
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Static pages
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/shop', priority: '0.9', changefreq: 'daily' },
    { url: '/generate', priority: '0.8', changefreq: 'weekly' },
    { url: '/about', priority: '0.6', changefreq: 'monthly' },
    { url: '/contact', priority: '0.5', changefreq: 'monthly' },
  ];
  
  // TODO: In real implementation, fetch from database
  // const products = await Product.find({ isActive: true });
  // const designs = await Design.find({ isPublic: true });
  
  // Simulated dynamic content
  const products = [
    { slug: 'vintage-tee-classic', lastModified: '2024-08-20' },
    { slug: 'retro-hoodie-special', lastModified: '2024-08-18' },
  ];
  
  const designs = [
    { slug: 'design-80s-neon', lastModified: '2024-08-25' },
    { slug: 'design-vintage-logo', lastModified: '2024-08-24' },
  ];
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Add static pages
  for (const page of staticPages) {
    sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }
  
  // Add product pages
  for (const product of products) {
    sitemap += `
  <url>
    <loc>${baseUrl}/product/${product.slug}</loc>
    <lastmod>${product.lastModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }
  
  // Add design pages
  for (const design of designs) {
    sitemap += `
  <url>
    <loc>${baseUrl}/design/${design.slug}</loc>
    <lastmod>${design.lastModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
  }
  
  sitemap += `
</urlset>`;

  return sitemap;
}

function countUrlsInSitemap(sitemap) {
  return (sitemap.match(/<url>/g) || []).length;
}