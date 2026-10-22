import type { ReactNode } from "react";
import { PortalLayout } from "@/components/vemgo/PortalLayout";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <PortalLayout role="client">{children}</PortalLayout>;
}
