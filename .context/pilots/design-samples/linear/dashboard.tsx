// Sample UI — Linear editorial tone
// Reference: governance/design/refs/linear.md
// Characteristics: monospace+sans pairing, monochrome, dense info, sharp corners,
// minimal shadows, precise typography hierarchy

export function ProjectDashboard() {
  return (
    <div className="bg-neutral-950 text-neutral-100 min-h-screen font-sans">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-baseline justify-between">
        <div className="flex items-baseline gap-6">
          <h1 className="text-sm font-medium tracking-tight">Engineering / Q2 Roadmap</h1>
          <nav className="flex gap-4 text-xs text-neutral-400">
            <a href="#issues" className="hover:text-neutral-100 transition-colors">Issues</a>
            <a href="#cycles" className="hover:text-neutral-100 transition-colors">Cycles</a>
            <a href="#projects" className="hover:text-neutral-100 transition-colors">Projects</a>
          </nav>
        </div>
        <button
          aria-label="Create new issue"
          className="text-xs border border-neutral-700 px-3 py-1.5 hover:border-neutral-500"
        >
          New issue
        </button>
      </header>

      <main className="px-6 py-4">
        <div className="flex items-center gap-4 text-xs text-neutral-500 mb-4 font-mono">
          <span>47 open</span>
          <span>·</span>
          <span>12 in progress</span>
          <span>·</span>
          <span>8 in review</span>
        </div>

        <table className="w-full text-sm">
          <thead className="text-xs text-neutral-500 border-b border-neutral-800">
            <tr>
              <th className="text-left py-2 font-normal">ID</th>
              <th className="text-left font-normal">Title</th>
              <th className="text-left font-normal">Assignee</th>
              <th className="text-right font-normal">Priority</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-900 hover:bg-neutral-900">
              <td className="py-2 font-mono text-xs text-neutral-400">ENG-2847</td>
              <td className="py-2">Refactor authentication middleware</td>
              <td className="py-2 text-neutral-400">@maya</td>
              <td className="py-2 text-right text-neutral-500">P1</td>
            </tr>
            <tr className="border-b border-neutral-900 hover:bg-neutral-900">
              <td className="py-2 font-mono text-xs text-neutral-400">ENG-2848</td>
              <td className="py-2">Migrate Postgres 14 → 16</td>
              <td className="py-2 text-neutral-400">@kent</td>
              <td className="py-2 text-right text-neutral-500">P0</td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
  );
}
