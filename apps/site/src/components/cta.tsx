import type { ReactNode } from "react";

type CTAProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export const CTA = (props: CTAProps) => {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:flex lg:items-center lg:justify-between lg:px-10">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {props.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {props.description}
          </p>
        </div>
        <div className="mt-10 flex items-center gap-4 lg:mt-0 lg:shrink-0">
          {props.children}
        </div>
      </div>
    </section>
  );
};
