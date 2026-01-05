"use client";

import { usePathname } from "next/navigation";
import {
  Button,
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
} from "@usevon/ui";
import { FileTextIcon, CaretDownIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";

const getMarkdownUrl = (pathname: string) => {
  return pathname === "/" ? "/index.md" : `${pathname}.md`;
};

const getGitHubPath = (pathname: string) => {
  const slug = pathname === "/" ? "" : pathname.slice(1);
  const filePath = slug ? `src/content/${slug}.mdx` : "src/components/home-page.tsx";
  return `https://github.com/usevon/von/blob/main/apps/docs/${filePath}`;
};

export const PageActions = () => {
  const pathname = usePathname();
  const markdownUrl = getMarkdownUrl(pathname);

  const handleOpenMarkdown = () => {
    window.open(markdownUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenIn = async (target: string) => {
    const fullMarkdownUrl = new URL(markdownUrl, window.location.origin).toString();
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
    <div className="flex flex-wrap items-center gap-2 not-prose my-6">
      <Button
        variant="outline"
        className="gap-1.5 active:scale-[0.97] transition-transform"
        onClick={handleOpenMarkdown}
      >
        <FileTextIcon className="size-4" />
        View as Markdown
      </Button>

      <Menu>
        <MenuTrigger
          render={
            <Button variant="outline" className="gap-1.5 active:scale-[0.97] transition-transform">
              Open In
              <CaretDownIcon className="size-4" />
            </Button>
          }
        />
        <MenuPopup align="start">
          <MenuItem onClick={() => handleOpenIn("github")} className="justify-between">
            Open in GitHub
            <ArrowSquareOutIcon className="size-4" />
          </MenuItem>
          <MenuItem onClick={() => handleOpenIn("chatgpt")} className="justify-between">
            Open in ChatGPT
            <ArrowSquareOutIcon className="size-4" />
          </MenuItem>
          <MenuItem onClick={() => handleOpenIn("claude")} className="justify-between">
            Open in Claude
            <ArrowSquareOutIcon className="size-4" />
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
};
