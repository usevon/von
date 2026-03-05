import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        primary: "#27272a",
        "primary-foreground": "#fafafa",
        foreground: "#18181b",
        muted: "#71717a",
        border: "#e4e4e7",
        destructive: "#ef4444",
        warning: "#f59e0b",
        success: "#10b981",
        info: "#3b82f6",
      },
    },
  },
};

const LOGO_URL =
  "https://3h7lcrx4kj.ufs.sh/f/JLhyRntM6ItLJRqZOEtM6ItLVOCJGSbUuAi3zXQKNo7kjfHD";

type EmailLayoutProps = {
  preview: string;
  children: ReactNode;
};

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind config={tailwindConfig}>
      <Body className="bg-white font-sans">
        <Container className="mx-auto my-10 w-[600px] max-w-full border border-border">
          <Section className="px-10 py-8">
            <Img alt="Von" height="22" src={LOGO_URL} width="28" />
          </Section>

          <Hr className="m-0 border-border" />

          {children}

          <Hr className="m-0 border-border" />

          <Section className="px-10 py-8">
            <Text className="m-0 mb-3 font-medium text-foreground text-xs">
              <Link
                className="text-foreground no-underline"
                href="https://usevon.com"
              >
                Von
              </Link>
            </Text>
            <Link
              className="block text-muted text-xs leading-5 no-underline"
              href="https://docs.usevon.com"
            >
              Docs
            </Link>
            <Link
              className="block text-muted text-xs leading-5 no-underline"
              href="mailto:support@usevon.com"
            >
              Support
            </Link>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
