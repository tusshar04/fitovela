import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/domain/company';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/plan/', '/quiz', '/result', '/unlock', '/login', '/my-plans'] }],
    host: SITE_URL,
  };
}
