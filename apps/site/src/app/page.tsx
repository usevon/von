import { BrandCarousel } from "@/components/brand-carousel";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";

export default function HomePage() {
  return (
    <>
      <Hero />
      <BrandCarousel className="py-16" />
      <Features />
    </>
  );
}
