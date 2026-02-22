"use client";

import { ArrowSquareOutIcon, CaretDownIcon } from "@phosphor-icons/react";
import { Button, Menu, MenuItem, MenuPopup, MenuTrigger } from "@usevon/ui";
import { usePathname } from "next/navigation";
import {
  AnthropicIcon,
  CursorIcon,
  GrokIcon,
  OpenAIIcon,
  T3ChatIcon,
} from "./open-in-icons";

const getMarkdownUrl = (pathname: string) =>
  pathname === "/" ? "/index.md" : `${pathname}.md`;

const getGitHubPath = (pathname: string) => {
  const slug = pathname === "/" ? "" : pathname.slice(1);
  const filePath = slug
    ? `src/content/${slug}.mdx`
    : "src/components/home-page.tsx";
  return `https://github.com/usevon/von/blob/main/apps/docs/${filePath}`;
};

const openInItems = (prompt: string, githubUrl: string) => [
  {
    label: "Open in GitHub",
    icon: <ArrowSquareOutIcon className="size-4" />,
    url: githubUrl,
  },
  {
    label: "Open in ChatGPT",
    icon: <OpenAIIcon />,
    url: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`,
  },
  {
    label: "Open in Claude",
    icon: <AnthropicIcon />,
    url: `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    label: "Open in Cursor",
    icon: <CursorIcon />,
    url: `https://cursor.com/link/prompt?text=${encodeURIComponent(prompt)}`,
  },
  {
    label: "Open in T3 Chat",
    icon: <T3ChatIcon />,
    url: `https://t3.chat/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    label: "Open in Grok",
    icon: <GrokIcon />,
    url: `https://x.com/i/grok?text=${encodeURIComponent(prompt)}`,
  },
];

type PageActionsProps = {
  className?: string;
};

export const PageActions = ({ className }: PageActionsProps) => {
  const pathname = usePathname();
  const markdownUrl = getMarkdownUrl(pathname);
  const fullMarkdownUrl =
    typeof window !== "undefined"
      ? new URL(markdownUrl, window.location.origin).toString()
      : markdownUrl;
  const prompt = `Read ${fullMarkdownUrl}, I want to ask questions about it.`;
  const githubUrl = getGitHubPath(pathname);
  const items = openInItems(prompt, githubUrl);

  const handleOpenMarkdown = () => {
    window.open(markdownUrl, "_blank", "noopener,noreferrer");
  };

  // Sidebar variant
  if (className !== undefined) {
    return (
      <div className={className}>
        <Button
          className="group w-full justify-start pl-3"
          onClick={handleOpenMarkdown}
          size="default"
          variant="ghost"
        >
          View as Markdown
          <span className="ml-auto text-muted-foreground/60 transition-colors group-hover:text-foreground">
            <ArrowSquareOutIcon className="size-4" />
          </span>
        </Button>
        {items.map((item) => (
          <Button
            className="group w-full justify-start pl-3"
            key={item.label}
            onClick={() =>
              window.open(item.url, "_blank", "noopener,noreferrer")
            }
            size="default"
            variant="ghost"
          >
            {item.label}
            <span className="ml-auto text-muted-foreground/60 transition-colors group-hover:text-foreground">
              {item.icon}
            </span>
          </Button>
        ))}
      </div>
    );
  }

  // Inline variant — hidden when TOC is visible
  return (
    <div className="not-prose mt-4 mb-0 flex flex-wrap items-center gap-2 xl:hidden">
      <Button
        className="gap-1.5 transition-transform active:scale-[0.97]"
        onClick={handleOpenMarkdown}
        variant="outline"
      >
        View as Markdown
        <ArrowSquareOutIcon className="size-4 text-muted-foreground/60" />
      </Button>

      <Menu>
        <MenuTrigger
          render={
            <Button
              className="gap-1.5 transition-transform active:scale-[0.97]"
              variant="outline"
            >
              Open In
              <CaretDownIcon className="size-4" />
            </Button>
          }
        />
        <MenuPopup align="start">
          {items.map((item) => (
            <MenuItem
              className="justify-between gap-4"
              key={item.label}
              onClick={() =>
                window.open(item.url, "_blank", "noopener,noreferrer")
              }
            >
              {item.label}
              {item.icon}
            </MenuItem>
          ))}
        </MenuPopup>
      </Menu>
    </div>
  );
};
