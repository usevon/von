type PropertiesProps = {
  children: React.ReactNode;
};

export const Properties = (props: PropertiesProps) => {
  return (
    <div className="my-6 divide-y divide-border rounded-lg border">
      {props.children}
    </div>
  );
};

type PropertyProps = {
  name: string;
  type: string;
  required?: boolean;
  children: React.ReactNode;
};

export const Property = (props: PropertyProps) => {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
          {props.name}
        </code>
        <span className="text-muted-foreground text-xs">{props.type}</span>
        {props.required && (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive text-xs font-medium">
            required
          </span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">{props.children}</div>
    </div>
  );
};
