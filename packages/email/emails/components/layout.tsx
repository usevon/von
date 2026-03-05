import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  pixelBasedPreset,
  Section,
  Tailwind,
  type TailwindConfig,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const tailwindConfig: TailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        primary: "#27272a",
        "primary-foreground": "#fafafa",
        foreground: "#18181b",
        muted: "#71717a",
        border: "#e4e4e7",
      },
    },
  },
};

const LOGO_URL =
  "https://3h7lcrx4kj.ufs.sh/f/JLhyRntM6ItLJRqZOEtM6ItLVOCJGSbUuAi3zXQKNo7kjfHD";

type EmailProps = {
  preview: string;
  children: ReactNode;
};

export const Email = ({ preview, children }: EmailProps) => (
  <Html>
    <Head />
    <Preview>{preview}</Preview>
    <Tailwind config={tailwindConfig}>
      <Body className="bg-white font-sans">
        <Container className="mx-auto my-10 w-[600px] max-w-full border border-border">
          <Section className="px-10 py-10">
            <Img
              alt="Von"
              className="mb-8"
              height="22"
              src={LOGO_URL}
              width="28"
            />
            {children}
          </Section>

          <Hr className="m-0 border-border" />

          <Section className="px-10 py-4">
            <Link href="https://usevon.com">
              <Img
                alt="Von"
                className="mb-4"
                height="18"
                src={LOGO_URL}
                width="22"
              />
            </Link>
            <table cellPadding={0} cellSpacing={0} width="100%">
              <tr>
                <td
                  style={{ verticalAlign: "top", paddingTop: "2px" }}
                  width="33%"
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
                  width="33%"
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
                  width="33%"
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
            <Text className="m-0 mt-4 text-muted text-xs leading-5">
              Please{" "}
              <Link
                className="text-muted underline"
                href="https://usevon.com/contact"
              >
                contact us
              </Link>{" "}
              if you have any questions. If you reply to this email, we won't be
              able to see it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);
