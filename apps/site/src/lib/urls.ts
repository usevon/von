const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

export function appUrl(path: string) {
  return `${APP_URL}${path}`;
}

export const urls = {
  login: appUrl("/auth/login"),
  signup: appUrl("/auth/signup"),
  signupPro: appUrl("/auth/signup?plan=pro"),
} as const;
