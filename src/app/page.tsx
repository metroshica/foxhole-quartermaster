/**
 * Landing/Home Page
 *
 * For now, this is a simple placeholder that will redirect to the dashboard
 * once authentication is set up. Unauthenticated users will see a login prompt.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Foxhole Quartermaster</h1>
        <p className="text-muted-foreground mb-8">
          Regiment logistics tracking for the 18th
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Sign in with Discord
          </a>
        </div>
      </div>
    </main>
  );
}
