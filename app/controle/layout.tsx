import type { ReactNode } from "react";
import { PortalLayout } from "@/components/vemgo/PortalLayout";

export default function ControlLayout({ children }: { children: ReactNode }) {
  return <PortalLayout role="admin">{children}</PortalLayout>;
}
