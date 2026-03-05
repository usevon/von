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

          <Section className="px-10 pt-8 pb-6">
            <table cellPadding={0} cellSpacing={0} width="100%">
              <tr>
                <td style={{ verticalAlign: "top" }} width="25%">
                  <Link href="https://usevon.com">
                    <Img alt="Von" height="18" src={LOGO_URL} width="22" />
                  </Link>
                </td>
                <td
                  style={{ verticalAlign: "top", paddingTop: "2px" }}
                  width="25%"
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "10px",
                      fontWeight: 500,
                      color: "#71717a",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Resources
                  </p>
                  <Link
                    className="block text-foreground text-xs leading-6 no-underline"
                    href="https://usevon.com/contact"
                  >
                    Contact
                  </Link>
                  <Link
                    className="block text-foreground text-xs leading-6 no-underline"
                    href="https://usevon.com/blog"
                  >
                    Blog
                  </Link>
                  <Link
                    className="block text-foreground text-xs leading-6 no-underline"
                    href="https://usevon.com/pricing"
                  >
                    Pricing
                  </Link>
                </td>
                <td
                  style={{ verticalAlign: "top", paddingTop: "2px" }}
                  width="25%"
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "10px",
                      fontWeight: 500,
                      color: "#71717a",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Documentation
                  </p>
                  <Link
                    className="block text-foreground text-xs leading-6 no-underline"
                    href="https://docs.usevon.com"
                  >
                    Home
                  </Link>
                  <Link
                    className="block text-foreground text-xs leading-6 no-underline"
                    href="https://docs.usevon.com/getting-started"
                  >
                    Getting Started
                  </Link>
                  <Link
                    className="block text-foreground text-xs leading-6 no-underline"
                    href="https://docs.usevon.com/api"
                  >
                    API Reference
                  </Link>
                </td>
                <td
                  style={{ verticalAlign: "top", paddingTop: "2px" }}
                  width="25%"
                >
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "10px",
                      fontWeight: 500,
                      color: "#71717a",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Legal
                  </p>
                  <Link
                    className="block text-foreground text-xs leading-6 no-underline"
                    href="https://usevon.com/privacy-policy"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    className="block text-foreground text-xs leading-6 no-underline"
                    href="https://usevon.com/terms-of-service"
                  >
                    Terms of Service
                  </Link>
                </td>
              </tr>
            </table>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
