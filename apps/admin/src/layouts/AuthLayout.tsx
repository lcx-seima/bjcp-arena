import { Card } from "antd";
import { type PropsWithChildren } from "react";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-shell">
      <Card className="auth-card">{children}</Card>
    </main>
  );
}
