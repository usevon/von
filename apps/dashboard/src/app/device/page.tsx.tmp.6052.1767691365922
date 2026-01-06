import { Logo } from "@/components/logo";

import { DeviceForm } from "./form";

type DevicePageProps = {
  searchParams: Promise<{ user_code?: string; code?: string }>;
};

export default async function DevicePage(props: DevicePageProps) {
  const searchParams = await props.searchParams;
  const code = searchParams.user_code || searchParams.code || "";
  const initialCode = code.toUpperCase().replace(/-/g, "");

  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      <div className="absolute left-0 top-0 m-4">
        <Logo />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Authorize device</h1>
            <p className="text-muted-foreground text-sm">
              Enter the code shown in your CLI
            </p>
          </div>
          <DeviceForm initialCode={initialCode} />
        </div>
      </div>
    </div>
  );
}
