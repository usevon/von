import { SignupForm } from "@/app/auth/signup/form";
import { getSafeRedirect } from "@/lib/redirect";

export const metadata = {
  title: "Sign up - Von",
};

type SignupPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function SignupPage(props: SignupPageProps) {
  const searchParams = await props.searchParams;
  const redirectTo = getSafeRedirect(searchParams.redirect);

  return <SignupForm redirectTo={redirectTo} />;
}
