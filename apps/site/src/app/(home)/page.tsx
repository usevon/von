import { Cta } from "@/components/cta";
import { Faq } from "./_components/faq";
import { FeatureGrid } from "./_components/feature-grid";
import { Hero } from "./_components/hero";
import { Integrations } from "./_components/integrations";
import { Pricing } from "./_components/pricing";
import { Resources } from "./_components/resources";
import { WorkflowTabs } from "./_components/workflow-tabs";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <WorkflowTabs />

      <FeatureGrid />
      <Integrations />
      <Pricing />
      <Faq />
      <Resources />
      <Cta />
    </main>
  );
}
