import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  articlePublishedTime?: string;
  articleAuthor?: string;
  noIndex?: boolean;
}

const BASE_URL = 'https://rainz.net';
const DEFAULT_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/3vP1NRSCrcNqqRJF2S1MsuHkUdh2/social-images/social-1766508867596-IMG_0173.jpeg';

export function SEOHead({
  title = 'Rainz Weather - AI-Powered Hyper-Local Weather Forecasts',
  description = 'Get accurate, AI-enhanced weather forecasts with Rainz Weather. Hyper-local predictions, pollen tracking, weather alerts, and gamified weather predictions. Free weather app.',
  keywords = 'Rainz, Rainz Weather, weather app, AI weather, weather forecast, local weather, pollen tracker, weather predictions, free weather app, accurate weather, ChatGPT weather, AI forecast',
  canonicalUrl,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  articlePublishedTime,
  articleAuthor,
  noIndex = false,
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const setMeta = (selector: string, content: string, isProperty = false) => {
      let meta = document.querySelector(selector) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setAttribute('property', selector.replace('meta[property="', '').replace('"]', ''));
        } else {
          meta.setAttribute('name', selector.replace('meta[name="', '').replace('"]', ''));
        }
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Primary meta tags
    setMeta('meta[name="title"]', title);
    setMeta('meta[name="description"]', description);
    setMeta('meta[name="keywords"]', keywords);
    
    if (noIndex) {
      setMeta('meta[name="robots"]', 'noindex, nofollow');
    } else {
      setMeta('meta[name="robots"]', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl || `${BASE_URL}${window.location.pathname}`;

    // Open Graph tags
    setMeta('meta[property="og:title"]', title, true);
    setMeta('meta[property="og:description"]', description, true);
    setMeta('meta[property="og:type"]', ogType, true);
    setMeta('meta[property="og:url"]', canonicalUrl || `${BASE_URL}${window.location.pathname}`, true);
    setMeta('meta[property="og:image"]', ogImage, true);

    // Twitter tags
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', ogImage);

    // Article-specific tags
    if (ogType === 'article' && articlePublishedTime) {
      setMeta('meta[property="article:published_time"]', articlePublishedTime, true);
      if (articleAuthor) {
        setMeta('meta[property="article:author"]', articleAuthor, true);
      }
    }

    // Cleanup function not needed as we want meta tags to persist
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, articlePublishedTime, articleAuthor, noIndex]);

  return null;
}

export default SEOHead;
