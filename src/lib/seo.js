/**
 * SEO Utilities
 *
 * JSON-LD structured data generators for rich search results.
 * Each function returns an object ready to be JSON.stringify'd
 * into a <script type="application/ld+json"> tag.
 */

import { siteConfig } from '../data/content.js';

/**
 * Person schema — appears on homepage and about page.
 */
export function getPersonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteConfig.name,
    url: siteConfig.url,
    jobTitle: 'Design Technologist',
    description: siteConfig.description,
    sameAs: [siteConfig.social.linkedin, siteConfig.social.github],
    worksFor: { '@type': 'Organization', name: 'Futurity Systems' },
    alumniOf: [
      { '@type': 'Organization', name: 'Apple' },
      { '@type': 'EducationalOrganization', name: 'Harbour.Space University' },
    ],
    knowsAbout: [
      'Design Technology',
      'Creative Technology',
      'React',
      'AI Tools',
      'Spatial Computing',
      'Robotics',
      'Hardware Engineering',
    ],
  };
}

/**
 * WebSite schema — appears on homepage.
 */
export function getWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    author: { '@type': 'Person', name: siteConfig.name },
  };
}

/**
 * CreativeWork schema — one per project page.
 */
export function getCreativeWorkJsonLd(project) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.description,
    url: `${siteConfig.url}/projects/${project.slug}`,
    image: project.image.startsWith('http')
      ? project.image
      : `${siteConfig.url}${project.image}`,
    creator: { '@type': 'Person', name: siteConfig.name, url: siteConfig.url },
    keywords: project.tags?.join(', '),
    dateCreated: project.meta?.match(/\d{4}/)?.[0],
  };
}

/**
 * BreadcrumbList schema — improves navigation display in search.
 */
export function getBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${siteConfig.url}${item.url}` : undefined,
    })),
  };
}

/**
 * BlogPosting schema — for blog posts.
 */
export function getBlogPostJsonLd(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: `${siteConfig.url}/blog/${post.slug}`,
    datePublished: post.date,
    author: { '@type': 'Person', name: siteConfig.name, url: siteConfig.url },
    keywords: post.tags?.join(', '),
  };
}
