/**
 * Auth Layout
 *
 * Minimal layout for authentication pages (login, regiment selection).
 * No sidebar or navigation - just centered content with branding.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}
