import { Alert } from "@mantine/core";
import { AlertCircle } from "lucide-react";

export function InlineError({ children }: { children: string }) {
  return (
    <Alert color="red" icon={<AlertCircle size={16} />} variant="light">
      {children}
    </Alert>
  );
}
