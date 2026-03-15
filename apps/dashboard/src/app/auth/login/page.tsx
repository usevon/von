import { LoginForm } from "@/app/auth/login/form";

export const metadata = {
  title: "Sign in - Von",
};

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export function getSafeRedirect(url: string | undefined): string {
  if (!url) {
    return "/";
  }
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return "/";
}

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const redirectTo = getSafeRedirect(searchParams.redirect);

  return <LoginForm redirectTo={redirectTo} />;
}
