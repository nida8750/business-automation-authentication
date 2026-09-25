"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

import { Skeleton } from "@/components/ui";

const Builder = dynamic(() => import("@/components/workflow/WorkflowBuilder").then((m) => m.WorkflowBuilder), {
  ssr: false,
  loading: () => <Skeleton className="h-[520px] w-full" />,
});

export default function WorkflowBuilderPage() {
  const params = useParams<{ id: string }>();
  return <Builder workflowId={params.id} />;
}
