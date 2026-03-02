export const H1 = (props: React.ComponentPropsWithoutRef<"h1">) => (
  <h1
    {...props}
    className="mb-0 font-semibold text-3xl text-foreground tracking-tight"
  />
);

const HeadingLinkIcon = () => (
  <svg
    aria-hidden
    className="size-4"
    fill="none"
    role="img"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Section link</title>
    <path
      d="M9.5 3.5H12.5V6.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.25"
    />
    <path
      d="M12.5 3.5L7.83333 8.16667"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.25"
    />
    <path
      d="M6.5 3.5H4.83333C4.09695 3.5 3.5 4.09695 3.5 4.83333V11.1667C3.5 11.903 4.09695 12.5 4.83333 12.5H11.1667C11.903 12.5 12.5 11.903 12.5 11.1667V9.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.25"
    />
  </svg>
);

export const H2 = (props: React.ComponentPropsWithoutRef<"h2">) => {
  const { children, id, ...rest } = props;

  return (
    <h2
      {...rest}
      className="group mt-10 scroll-mt-24 border-border border-b pb-2 font-semibold text-foreground text-xl tracking-tight"
      id={id}
    >
      {id ? (
        <a
          className="inline-flex cursor-pointer items-center gap-2 no-underline hover:no-underline focus-visible:underline"
          href={`#${id}`}
        >
          <span
            className="underline-offset-4 group-focus-within:underline group-hover:underline"
            data-heading-text
          >
            {children}
          </span>
          <span className="text-muted-foreground/70 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <HeadingLinkIcon />
          </span>
        </a>
      ) : (
        children
      )}
    </h2>
  );
};

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
    className="rounded-none bg-muted px-1.5 py-0.5 font-mono text-sm"
  />
);
