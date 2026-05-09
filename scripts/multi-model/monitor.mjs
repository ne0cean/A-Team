#!/usr/bin/env node
/**
 * Multi-Model Router Monitor
 *
 * Usage:
 *   node monitor.mjs              # Show current status
 *   node monitor.mjs --watch      # Live monitoring (5s refresh)
 *   node monitor.mjs --test       # Test all endpoints
 */

const LITELLM_URL = process.env.LITELLM_URL || 'http://localhost:4000';
const LITELLM_KEY = process.env.LITELLM_KEY || 'sk-ateam-litellm';
const OLLAMA_URL = 'http://localhost:11434';

const MODELS = [
  { name: 'groq-free', type: 'cloud', desc: 'Llama 70B (무료)' },
  { name: 'groq-fast', type: 'cloud', desc: 'Llama 8B (무료)' },
  { name: 'local-fast', type: 'local', desc: 'Qwen 7B (로컬)' },
  { name: 'local-strong', type: 'local', desc: 'Qwen 32B (로컬)' },
  { name: 'coder', type: 'paid', desc: 'Claude Sonnet' },
  { name: 'planner', type: 'paid', desc: 'Claude Sonnet' },
];

async function checkLiteLLM() {
  try {
    const res = await fetch(`${LITELLM_URL}/health`, { timeout: 3000 });
    return res.ok ? '✅ Running' : '⚠️ Unhealthy';
  } catch {
    return '❌ Offline';
  }
}

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    if (!res.ok) return '❌ Offline';
    const data = await res.json();
    const models = data.models?.map(m => m.name.split(':')[0]) || [];
    return `✅ ${models.length} models`;
  } catch {
    return '❌ Offline';
  }
}

async function testModel(model) {
  const start = Date.now();
  try {
    const res = await fetch(`${LITELLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LITELLM_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
      timeout: 30000,
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      const err = await res.text();
      return { status: '❌', latency: '-', error: err.slice(0, 50) };
    }
    return { status: '✅', latency: `${latency}ms`, error: null };
  } catch (e) {
    return { status: '❌', latency: '-', error: e.message.slice(0, 50) };
  }
}

async function getSpend() {
  try {
    const res = await fetch(`${LITELLM_URL}/spend/logs`, {
      headers: { 'Authorization': `Bearer ${LITELLM_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');
  const testMode = args.includes('--test');

  const display = async () => {
    console.clear();
    console.log('═══════════════════════════════════════════════════');
    console.log('       Multi-Model Router Status');
    console.log('═══════════════════════════════════════════════════\n');

    // Service status
    const [litellm, ollama] = await Promise.all([checkLiteLLM(), checkOllama()]);
    console.log(`LiteLLM Proxy : ${litellm}`);
    console.log(`Ollama        : ${ollama}`);
    console.log('');

    // Model list
    console.log('Available Models:');
    console.log('─────────────────────────────────────────────────');
    console.log('Name           Type    Description');
    console.log('─────────────────────────────────────────────────');
    for (const m of MODELS) {
      const type = m.type === 'cloud' ? '☁️ ' : m.type === 'local' ? '💻' : '💰';
      console.log(`${m.name.padEnd(14)} ${type}     ${m.desc}`);
    }
    console.log('');

    // Test endpoints if requested
    if (testMode) {
      console.log('Endpoint Tests:');
      console.log('─────────────────────────────────────────────────');
      for (const m of MODELS) {
        process.stdout.write(`Testing ${m.name}... `);
        const result = await testModel(m.name);
        console.log(`${result.status} ${result.latency} ${result.error || ''}`);
      }
      console.log('');
    }

    // Usage stats (if available)
    const spend = await getSpend();
    if (spend && spend.length > 0) {
      console.log('Recent Usage:');
      console.log('─────────────────────────────────────────────────');
      const recent = spend.slice(-5);
      for (const s of recent) {
        console.log(`${s.model}: ${s.total_tokens} tokens, $${s.spend?.toFixed(4) || '0'}`);
      }
    }

    console.log('\n─────────────────────────────────────────────────');
    console.log('Commands:');
    console.log('  llm "prompt"           Quick query (groq-free)');
    console.log('  llm -m local-fast "x"  Use specific model');
    console.log('  node monitor.mjs --test  Test all endpoints');
    console.log('═══════════════════════════════════════════════════');

    if (watchMode) {
      console.log('\n[Refreshing every 5s... Ctrl+C to exit]');
    }
  };

  await display();

  if (watchMode) {
    setInterval(display, 5000);
  }
}

main();
