const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export function siteUrl(path: string = "") {
  return `${SITE_URL}${path}`;
}

export function appUrl(path: string = "") {
  return `${APP_URL}${path}`;
}
