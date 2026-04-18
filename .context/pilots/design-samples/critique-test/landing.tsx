// Test sample for PL-01 (tone mismatch) + PL-02 (missing personality)
// Declared tone: luxury (see .design-override.md in same dir)
// Actual style: brutalist + identical card repetition (intentional violation for LLM critique test)

export function Landing() {
  return (
    <div className="font-mono bg-yellow-300 text-black">
      {/* PL-01 violation: tone=luxury but using brutalist mono + harsh yellow */}
      <header className="border-4 border-black p-8">
        <h1 className="text-6xl uppercase tracking-tighter">FEATURES</h1>
      </header>

      {/* PL-02 violation: 4 identical cards, no hierarchy, no personality */}
      <section className="grid grid-cols-3 gap-4 p-8">
        <div className="border-4 border-black p-6 bg-white">
          <h2 className="text-2xl uppercase">FEATURE</h2>
          <p>Description text here.</p>
          <button className="border-2 border-black px-4 py-2 mt-4">CLICK</button>
        </div>
        <div className="border-4 border-black p-6 bg-white">
          <h2 className="text-2xl uppercase">FEATURE</h2>
          <p>Description text here.</p>
          <button className="border-2 border-black px-4 py-2 mt-4">CLICK</button>
        </div>
        <div className="border-4 border-black p-6 bg-white">
          <h2 className="text-2xl uppercase">FEATURE</h2>
          <p>Description text here.</p>
          <button className="border-2 border-black px-4 py-2 mt-4">CLICK</button>
        </div>
        <div className="border-4 border-black p-6 bg-white">
          <h2 className="text-2xl uppercase">FEATURE</h2>
          <p>Description text here.</p>
          <button className="border-2 border-black px-4 py-2 mt-4">CLICK</button>
        </div>
      </section>

      {/* Additional identical sections to amplify PL-02 */}
      <section className="grid grid-cols-3 gap-4 p-8">
        <div className="border-4 border-black p-6 bg-white">
          <h2 className="text-2xl uppercase">BENEFIT</h2>
          <p>Same layout as features.</p>
        </div>
        <div className="border-4 border-black p-6 bg-white">
          <h2 className="text-2xl uppercase">BENEFIT</h2>
          <p>Same layout as features.</p>
        </div>
        <div className="border-4 border-black p-6 bg-white">
          <h2 className="text-2xl uppercase">BENEFIT</h2>
          <p>Same layout as features.</p>
        </div>
      </section>
    </div>
  );
}
