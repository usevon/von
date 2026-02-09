"use client";

import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  FileTextIcon,
} from "@phosphor-icons/react";
import { Button, Menu, MenuItem, MenuPopup, MenuTrigger } from "@usevon/ui";
import { usePathname } from "next/navigation";

const getMarkdownUrl = (pathname: string) =>
  pathname === "/" ? "/index.md" : `${pathname}.md`;

const getGitHubPath = (pathname: string) => {
  const slug = pathname === "/" ? "" : pathname.slice(1);
  const filePath = slug
    ? `src/content/${slug}.mdx`
    : "src/components/home-page.tsx";
  return `https://github.com/usevon/von/blob/main/apps/docs/${filePath}`;
};

export const PageActions = () => {
  const pathname = usePathname();
  const markdownUrl = getMarkdownUrl(pathname);

  const handleOpenMarkdown = () => {
    window.open(markdownUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenIn = (target: string) => {
    const fullMarkdownUrl = new URL(
      markdownUrl,
      window.location.origin
    ).toString();
    const prompt = `Read ${fullMarkdownUrl}, I want to ask questions about it.`;

    const urls: Record<string, string> = {
      github: getGitHubPath(pathname),
      chatgpt: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`,
      claude: `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
    };
    if (urls[target]) {
      window.open(urls[target], "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="not-prose my-6 flex flex-wrap items-center gap-2">
      <Button
        className="gap-1.5 transition-transform active:scale-[0.97]"
        onClick={handleOpenMarkdown}
        variant="outline"
      >
        <FileTextIcon className="size-4" />
        View as Markdown
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
          <MenuItem
            className="justify-between"
            onClick={() => handleOpenIn("github")}
          >
            Open in GitHub
            <ArrowSquareOutIcon className="size-4" />
          </MenuItem>
          <MenuItem
            className="justify-between"
            onClick={() => handleOpenIn("chatgpt")}
          >
            Open in ChatGPT
            <ArrowSquareOutIcon className="size-4" />
          </MenuItem>
          <MenuItem
            className="justify-between"
            onClick={() => handleOpenIn("claude")}
          >
            Open in Claude
            <ArrowSquareOutIcon className="size-4" />
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
};
