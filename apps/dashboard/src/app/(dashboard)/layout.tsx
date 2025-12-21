type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout(props: DashboardLayoutProps) {
  return <div className="p-4">{props.children}</div>;
}
