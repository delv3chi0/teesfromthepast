// frontend/src/components/SEO.jsx
import { Helmet } from 'react-helmet-async';

/**
 * SEO component for managing page meta tags
 */
function SEO({
  title = 'Tees From The Past',
  description = 'Create unique vintage-style t-shirts with AI-powered design tools',
  image = '/og-image.jpg',
  url = window.location.href,
  type = 'website',
  siteName = 'Tees From The Past',
  twitterCard = 'summary_large_image',
  twitterSite = '@teesfromthepast',
  keywords = 'vintage t-shirts, AI design, custom apparel, retro clothing',
  author = 'Tees From The Past',
  robots = 'index, follow',
  canonical = null,
  jsonLd = null,
  children
}) {
  // Ensure title is properly formatted
  const pageTitle = title === siteName ? title : `${title} | ${siteName}`;
  
  // Ensure URL is absolute
  const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const absoluteImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robots} />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:url" content={absoluteUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      
      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
      
      {/* Additional custom elements */}
      {children}
    </Helmet>
  );
}

/**
 * Product SEO component for product pages
 */
function ProductSEO({
  product,
  baseUrl = window.location.origin,
  ...props
}) {
  if (!product) return <SEO {...props} />;

  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name || product.title,
    "description": product.description,
    "image": product.image ? `${baseUrl}${product.image}` : undefined,
    "brand": {
      "@type": "Brand",
      "name": "Tees From The Past"
    },
    "offers": product.price ? {
      "@type": "Offer",
      "url": `${baseUrl}/products/${product.id || product._id}`,
      "priceCurrency": "USD",
      "price": product.price,
      "availability": "https://schema.org/InStock"
    } : undefined
  };

  return (
    <SEO
      title={product.name || product.title}
      description={product.description}
      image={product.image}
      type="product"
      jsonLd={productJsonLd}
      {...props}
    />
  );
}

/**
 * Article SEO component for blog posts/articles
 */
function ArticleSEO({
  article,
  baseUrl = window.location.origin,
  ...props
}) {
  if (!article) return <SEO {...props} />;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description || article.excerpt,
    "image": article.image ? `${baseUrl}${article.image}` : undefined,
    "author": {
      "@type": "Person",
      "name": article.author || "Tees From The Past"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Tees From The Past",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`
      }
    },
    "datePublished": article.publishedAt || article.createdAt,
    "dateModified": article.updatedAt || article.publishedAt || article.createdAt
  };

  return (
    <SEO
      title={article.title}
      description={article.description || article.excerpt}
      image={article.image}
      type="article"
      jsonLd={articleJsonLd}
      {...props}
    />
  );
}

export { SEO, ProductSEO, ArticleSEO };
export default SEO;