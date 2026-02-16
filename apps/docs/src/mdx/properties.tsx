import { Badge } from "@usevon/ui";

type PropertiesProps = {
  children: React.ReactNode;
};

export const Properties = (props: PropertiesProps) => (
  <div className="my-6 divide-y divide-border border">
    {props.children}
  </div>
);

type PropertyProps = {
  name: string;
  type: string;
  required?: boolean;
  children: React.ReactNode;
};

export const Property = (props: PropertyProps) => (
  <div className="flex flex-col gap-2 p-4">
    <div className="flex items-center gap-2">
      <Badge className="rounded-none font-mono" size="lg" variant="secondary">
        {props.name}
      </Badge>
      <Badge className="rounded-none" size="lg" variant="outline">
        {props.type}
      </Badge>
      {props.required ? (
        <Badge className="rounded-none" size="lg" variant="error">
          required
        </Badge>
      ) : null}
    </div>
    <div className="text-muted-foreground text-sm">{props.children}</div>
  </div>
);
