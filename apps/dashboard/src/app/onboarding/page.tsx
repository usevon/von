import { OnboardingForm } from "./form";

export const metadata = {
  title: "Create your team - Von",
};

export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your team</h1>
        <p className="text-muted-foreground text-sm">
          Teams help you organize your webhooks and collaborate with others
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
