import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { WorkflowTabs } from "@/components/workflow-tabs";

const frameClass = "mx-auto w-full max-w-[76rem]";

export default function HomePage() {
  return (
    <main className="bg-background text-foreground">
      <Header />
      <Hero />

      <section>
        <div className={frameClass}>
          <WorkflowTabs />
        </div>
      </section>
    </main>
  );
}
