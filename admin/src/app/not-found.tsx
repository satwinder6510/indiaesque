export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          404
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Page not found
        </p>
        <a
          href="/"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          ← Back to dashboard
        </a>
      </div>
    </div>
  );
}
