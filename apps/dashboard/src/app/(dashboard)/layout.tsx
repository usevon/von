type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout(props: DashboardLayoutProps) {
  return <div className="flex min-h-0 flex-1 flex-col p-4">{props.children}</div>;
}
