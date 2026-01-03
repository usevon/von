"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Button,
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
} from "@usevon/ui";
import {
  CopyIcon,
  CheckIcon,
  CaretDownIcon,
  ArrowSquareOutIcon,
} from "@phosphor-icons/react";

const usePageContent = () => {
  const [content, setContent] = useState("");

  useEffect(() => {
    const article = document.querySelector("article");
    if (article) {
      setContent(article.innerText);
    }
  }, []);

  return content;
};

const getGitHubPath = (pathname: string) => {
  const slug = pathname === "/" ? "" : pathname.slice(1);
  const filePath = slug ? `src/content/${slug}.mdx` : "src/components/home-page.tsx";
  return `https://github.com/usevon/von/blob/main/apps/docs/${filePath}`;
};

export const PageActions = () => {
  const pathname = usePathname();
  const content = usePageContent();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenIn = (target: string) => {
    const encodedContent = encodeURIComponent(content);
    const urls: Record<string, string> = {
      github: getGitHubPath(pathname),
      chatgpt: `https://chat.openai.com/?q=${encodedContent}`,
      claude: `https://claude.ai/new?q=${encodedContent}`,
    };
    if (urls[target]) {
      window.open(urls[target], "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex items-center gap-2 not-prose my-6">
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

      <Button
        variant="outline"
        className="gap-1.5 active:scale-[0.97] transition-transform"
        onClick={handleCopy}
      >
        <span className="relative size-4">
          <CopyIcon
            className={`size-4 absolute inset-0 transition-all duration-150 ease-out ${
              copied ? "scale-50 opacity-0 blur-[2px]" : "scale-100 opacity-100"
            }`}
          />
          <CheckIcon
            className={`size-4 absolute inset-0 text-emerald-500 transition-all duration-150 ease-out ${
              copied ? "scale-100 opacity-100" : "scale-50 opacity-0 blur-[2px]"
            }`}
          />
        </span>
        {copied ? "Copied!" : "Copy Markdown"}
      </Button>

    </div>
  );
};
