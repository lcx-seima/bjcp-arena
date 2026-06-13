import { Alert } from "@mantine/core";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function InlineMessage({ children, type }: { children: string; type: "error" | "success" }) {
  return (
    <Alert
      color={type === "error" ? "red" : "green"}
      icon={type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      variant="light"
    >
      {children}
    </Alert>
  );
}
