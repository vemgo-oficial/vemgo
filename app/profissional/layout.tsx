import type { ReactNode } from "react";
import { PortalLayout } from "@/components/vemgo/PortalLayout";

export default function ProfessionalLayout({ children }: { children: ReactNode }) {
  return <PortalLayout role="professional">{children}</PortalLayout>;
}
