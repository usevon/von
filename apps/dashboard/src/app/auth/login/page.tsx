import { LoginForm } from "@/app/auth/login/form";
import { getSafeRedirect } from "@/lib/redirect";

export const metadata = {
  title: "Sign in - Von",
};

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const redirectTo = getSafeRedirect(searchParams.redirect);

  return <LoginForm redirectTo={redirectTo} />;
}
