import { Heading, Button as REButton, Text } from "@react-email/components";
import type { ReactNode } from "react";

export const EmailTitle = ({ children }: { children: ReactNode }) => (
  <Heading className="m-0 mb-4 font-semibold text-2xl text-foreground leading-8">
    {children}
  </Heading>
);

export const EmailText = ({ children }: { children: ReactNode }) => (
  <Text className="m-0 mb-6 text-[15px] text-muted leading-7">{children}</Text>
);

export const EmailButton = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <REButton
    className="inline-block border border-primary bg-primary px-4 py-2 text-center font-medium text-[13px] text-primary-foreground no-underline"
    href={href}
  >
    {children}
  </REButton>
);

export const EmailTimestamp = ({ children }: { children: ReactNode }) => (
  <table cellPadding={0} cellSpacing={0} className="m-0 mb-6">
    <tr>
      <td className="border-border border-l-2 pl-3 text-[13px] text-muted leading-5">
        {children}
      </td>
    </tr>
  </table>
);
