import { Logo } from "@/components/logo";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export default async function AuthLayout(props: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      <div className="absolute left-0 top-0 m-4">
        <Logo />
      </div>
      <div className="w-full max-w-sm">{props.children}</div>
    </div>
  );
}
