import { SignupForm } from "@/app/auth/signup/form";

export const metadata = {
  title: "Sign up - Von",
};

type SignupPageProps = {
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

export default async function SignupPage(props: SignupPageProps) {
  const searchParams = await props.searchParams;
  const redirectTo = getSafeRedirect(searchParams.redirect);

  return <SignupForm redirectTo={redirectTo} />;
}
