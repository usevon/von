import {
  Heading,
  Button as REButton,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

export const EmailBody = ({ children }: { children: ReactNode }) => (
  <Section className="px-10 py-10">{children}</Section>
);

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
    className="inline-block border border-primary bg-primary px-6 py-3 text-center font-medium text-[14px] text-primary-foreground no-underline"
    href={href}
  >
    {children}
  </REButton>
);

export const EmailFootnote = ({ children }: { children: ReactNode }) => (
  <Text className="m-0 mt-4 text-[13px] text-muted leading-5">{children}</Text>
);

export const EmailTimestamp = ({ children }: { children: ReactNode }) => (
  <table
    cellPadding={0}
    cellSpacing={0}
    style={{ marginTop: "16px", marginBottom: "24px" }}
  >
    <tr>
      <td
        style={{
          borderLeft: "2px solid #e4e4e7",
          paddingLeft: "12px",
          color: "#71717a",
          fontSize: "13px",
          lineHeight: "20px",
        }}
      >
        {children}
      </td>
    </tr>
  </table>
);
