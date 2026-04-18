// Sample UI — Stripe minimal trust tone
// Reference: governance/design/refs/stripe.md
// Characteristics: ample whitespace, high contrast text, subtle blue accent,
// sentence-case clarity, no ornamentation, grid-aligned, accessible focus

export function CheckoutForm() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Pay with card</h1>
          <p className="text-sm text-slate-600">Total due today: $24.00</p>
        </header>

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="card" className="block text-sm font-medium text-slate-700 mb-1.5">
              Card information
            </label>
            <input
              id="card"
              type="text"
              required
              inputMode="numeric"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm
                         focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="1234 1234 1234 1234"
            />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <input
                type="text"
                aria-label="Expiration date (MM/YY)"
                className="px-3 py-2 border border-slate-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="MM / YY"
              />
              <input
                type="text"
                aria-label="CVC"
                className="px-3 py-2 border border-slate-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="CVC"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-2.5 rounded-md text-sm font-medium
                       hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            Pay $24.00
          </button>

          <p className="text-xs text-slate-500 text-center pt-2">
            Powered by <span className="font-semibold text-slate-700">Stripe</span>
          </p>
        </form>
      </div>
    </div>
  );
}
