export const H1 = (props: React.ComponentPropsWithoutRef<"h1">) => (
  <h1
    {...props}
    className="mb-0 font-semibold text-3xl text-foreground tracking-tight"
  />
);

export const H2 = (props: React.ComponentPropsWithoutRef<"h2">) => (
  <h2
    {...props}
    className="mt-10 scroll-mt-24 border-border border-b pb-2 font-semibold text-foreground text-xl tracking-tight"
  />
);

export const H3 = (props: React.ComponentPropsWithoutRef<"h3">) => (
  <h3
    {...props}
    className="mt-8 scroll-mt-24 font-semibold text-foreground text-lg"
  />
);

export const H4 = (props: React.ComponentPropsWithoutRef<"h4">) => (
  <h4 {...props} className="mt-6 font-semibold text-foreground" />
);

export const P = (props: React.ComponentPropsWithoutRef<"p">) => (
  <p {...props} className="mt-2 text-muted-foreground leading-7" />
);

export const A = (props: React.ComponentPropsWithoutRef<"a">) => (
  <a
    {...props}
    className="text-primary underline underline-offset-4 hover:text-primary/80"
  />
);

export const Ul = (props: React.ComponentPropsWithoutRef<"ul">) => (
  <ul {...props} className="mt-4 list-disc pl-6 text-muted-foreground" />
);

export const Ol = (props: React.ComponentPropsWithoutRef<"ol">) => (
  <ol {...props} className="mt-4 list-decimal pl-6 text-muted-foreground" />
);

export const Li = (props: React.ComponentPropsWithoutRef<"li">) => (
  <li {...props} className="mt-2" />
);

export const Blockquote = (
  props: React.ComponentPropsWithoutRef<"blockquote">
) => (
  <blockquote
    {...props}
    className="mt-4 border-border border-l-4 pl-4 text-muted-foreground italic"
  />
);

export const Hr = (props: React.ComponentPropsWithoutRef<"hr">) => (
  <hr {...props} className="my-8 border-border" />
);

export const Table = (props: React.ComponentPropsWithoutRef<"table">) => (
  <table {...props} className="mt-4 w-full border-collapse text-sm" />
);

export const Th = (props: React.ComponentPropsWithoutRef<"th">) => (
  <th
    {...props}
    className="border-border border-b px-4 py-2 text-left font-semibold text-foreground"
  />
);

export const Td = (props: React.ComponentPropsWithoutRef<"td">) => (
  <td
    {...props}
    className="border-border border-b px-4 py-2 text-muted-foreground"
  />
);

export const Strong = (props: React.ComponentPropsWithoutRef<"strong">) => (
  <strong {...props} className="font-semibold text-foreground" />
);

export const InlineCode = (props: React.ComponentPropsWithoutRef<"code">) => (
  <code
    {...props}
    className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
  />
);
