import { AnimatedContent } from "@/components/docs/animated-content";
import { PageActions } from "@/components/docs/page-actions";
import { TableOfContents } from "@/components/docs/toc";
import { Sidebar } from "@/components/sidebar";

type DocsSlugLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug?: string[] }>;
};

export default async function DocsSlugLayout(props: DocsSlugLayoutProps) {
  const { slug } = await props.params;
  const isHome = !slug || slug.length === 0;

  if (isHome) {
    return <>{props.children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <div className="flex gap-12 px-8 pt-6 pb-10 sm:px-12">
          <div className="min-w-0 max-w-4xl flex-1">
            <AnimatedContent>{props.children}</AnimatedContent>
          </div>
          <aside className="sticky top-20 hidden h-fit w-48 shrink-0 xl:block">
            <TableOfContents />
            <PageActions className="mt-4 flex flex-col" />
          </aside>
        </div>
      </div>
    </div>
  );
}
