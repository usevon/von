type LegalDocumentProps = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export const LegalDocument = (props: LegalDocumentProps) => {
  return (
    <main className="py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 sm:gap-16 lg:px-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{props.title}</h1>
          <p className="text-lg text-muted-foreground">Last updated on {props.lastUpdated}.</p>
        </div>
        <div className="max-w-2xl space-y-4 text-sm/7 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-base/8 [&_h2]:font-medium [&_h2]:text-foreground [&_h2]:not-first:mt-8 [&_li]:pl-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6">
          {props.children}
        </div>
      </div>
    </main>
  );
};
