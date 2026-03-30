export function getSafeRedirect(url: string | undefined): string {
  if (!url) {
    return "/";
  }
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return "/";
}
