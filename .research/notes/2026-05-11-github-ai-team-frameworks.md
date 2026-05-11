# Research: GitHub AI Team Frameworks

> Date: 2026-05-11
> Source: Research agent a26dd8b198514102e

[
  {
    "type": "text",
    "text": "Perfect. Now I have comprehensive data. Let me compile the structured research report:

```json
{
  \"task_id\": \"ai-agent-company-frameworks-research\",
  \"status\": \"DONE\",
  \"question\": \"Which GitHub projects implement the most comprehensive AI agent team/company frameworks with multiple departments?\",
  \"summary\": \"Found 20+ production and experimental frameworks across GitHub. Top tier: MetaGPT (PM/Architect/Engineer roles), ChatDev 2.0 (1000+ configurable agents), Agency Agents (147 agents across 13 divisions). Secondary tier: CAMEL, CrewAI, Microsoft TinyTroupe, PraisonAI. Claude Code has native multi-agent orchestration. All support 100+ LLMs and can be deployed production.\",
  \"findings\": [
    {
      \"source\": \"https://github.com/FoundationAgents/MetaGPT\",
      \"key_point\": \"Complete software company simulation with Product Manager, Architect, Project Manager, Engineer roles\",
      \"evidence\": \"Implements SOP-based agent orchestration with philosophy 'Code = SOP(Team)'. Takes one-line requirement input, outputs requirements/design/code/docs across PM, Architecture, PM, and Engineering domains. Supports OpenAI, Azure, Ollama, Groq.\"
    },
    {
      \"source\": \"https://github.com/OpenBMB/ChatDev\",
      \"key_point\": \"Evolved from fixed software company roles (v1.0) to zero-code general-purpose multi-agent orchestration (v2.0 DevAll)\",
      \"evidence\": \"v1.0: CEO, CTO, Programmer, Designer, Reviewer agents in functional seminars. v2.0: Supports 1000+ agents via YAML config, directed acyclic graphs (MacNet topology), no fixed roles. Python FastAPI + Vue 3 frontend. NeurIPS 2025 paper on 'Multi-Agent Collaboration via Evolving Orchestration'.\"
    },
    {
      \"source\": \"https://github.com/msitarzewski/agency-agents\",
      \"key_point\": \"147+ specialized agents organized across 13 production divisions matching real corporate functions\",
      \"evidence\": \"Divisions: Engineering (28), Marketing (27+), Sales (9), Design (8), Paid Media (7), QA (8), Product (5), Project Management (6), Support (6), Spatial Computing (6), Finance, Academic/Strategy. Works natively with Claude Code, GitHub Copilot, Cursor, Aider. Battle-tested workflows with success metrics.\"
    },
    {
      \"source\": \"https://github.com/camel-ai/camel\",
      \"key_point\": \"Research framework focused on multi-agent scaling laws and emergent behaviors at 1M+ agent scale\",
      \"evidence\": \"Specializes in studying scaling laws across 3 dimensions: Number of Agents (supports 1M agents), Environments (computer ops & RL), Evolution (synthetic data & RL). Includes agents: Deductive Reasoner, Multi-Hop Generator, Role Assignment, Embodied Agent. Community-driven since 2023.\"
    },
    {
      \"source\": \"https://github.com/crewAIInc/crewAI\",
      \"key_point\": \"Role-playing autonomous agent framework independent of LangChain, optimized for collaborative intelligence\",
      \"evidence\": \"Pure Python framework designed from scratch. Supports agents with specific roles/expertise collaborating on complex tasks. AMP platform enables department-wide adoption from dev to production. Used for marketing research, sales pipeline, PM business planning.\"
    },
    {
      \"source\": \"https://github.com/microsoft/TinyTroupe\",
      \"key_point\": \"Persona-based agent simulation for business insights - agents represent archetypical people (physicians, lawyers, engineers)\",
      \"evidence\": \"Uses detailed persona specs (age, occupation, skills, opinions). Applications: Ad testing (Bing Ads offline eval), software testing (test input generation), training data generation, product feedback from specific personas. GPT-4 powered. Release 0.6.0 (Feb 2026) uses gpt-4o-mini.\"
    },
    {
      \"source\": \"https://github.com/MervinPraison/PraisonAI\",
      \"key_point\": \"Low-code framework combining CrewAI, AutoGen, and PraisonAI into production-ready system\",
      \"evidence\": \"Agents: research, planning, coding, task execution. 5-line deployment. Built-in memory, RAG, 100+ LLM support. Alternative at PraisonLabs/Praison emphasizes self-reflection, reasoning, tool use, and code/no-code workflows.\"
    },
    {
      \"source\": \"https://github.com/2FastLabs/agent-squad\",
      \"key_point\": \"SupervisorAgent pattern for hierarchical team coordination with intelligent intent routing\",
      \"evidence\": \"Lead agent coordinates specialized agents in parallel via 'agent-as-tools' architecture. Dynamic intent classification routes to suitable agent. Maintains context across agents. AWS solutions guidance available. Streaming response support.\"
    },
    {
      \"source\": \"https://github.com/OpenBMB/AgentVerse\",
      \"key_point\": \"Task-solving and simulation frameworks for deploying agents in custom environments\",
      \"evidence\": \"Two primary frameworks: task-solving (agent coordination for complex tasks), simulation (observe multi-agent behaviors in environments). Allows custom environment setup. Official launch May 1, 2023.\"
    },
    {
      \"source\": \"https://github.com/microsoft/agent-framework\",
      \"key_point\": \"Production-grade multi-language framework from Microsoft for AI agents and workflows\",
      \"evidence\": \"Supports Python and .NET. Enterprise-focused. Orchestrates multi-agent workflows with state management. Compatible with major cloud providers.\"
    },
    {
      \"source\": \"https://code.claude.com/docs/en/agent-teams\",
      \"key_point\": \"Claude Code native multi-agent orchestration - one lead session coordinates parallel specialist teammates\",
      \"evidence\": \"Experimental feature (v2.1.32+). Requires Claude Opus 4.6. Each agent has own context window, shared filesystem. Roles: backend/frontend/testing/reviewer. Best for research (parallel investigation), new features (separate ownership), debugging (competing hypotheses), cross-layer coordination.\"
    },
    {
      \"source\": \"https://github.com/langchain-ai/deepagents\",
      \"key_point\": \"LangChain's Deep Agents: Python/TypeScript harness for long-running complex tasks with subagent spawning\",
      \"evidence\": \"Built on LangGraph. Planning tool breaks tasks into steps. Virtual filesystem (read/write/revisit). Can spawn specialized sub-agents. Handles context management for multi-step workflows.\"
    },
    {
      \"source\": \"https://github.com/elizaOS/the-org\",
      \"key_point\": \"Organizational agents for handling business functions: community management, developer relations, project coordination, social media, inter-org liaison\",
      \"evidence\": \"Specialized agents map to organizational functions. Demonstrates role-based agent assignment to corporate tasks.\"
    },
    {
      \"source\": \"https://github.com/VoltAgent/voltagent\",
      \"key_point\": \"TypeScript-based AI Agent Engineering Platform with supervisor/sub-agent hierarchy\",
      \"evidence\": \"Supervisors coordinate teams of specialized agents. Open source framework. Focus on engineering use cases.\"
    },
    {
      \"source\": \"https://github.com/agno-agi/agno\",
      \"key_point\": \"High-level framework to build, run, and manage agent platforms\",
      \"evidence\": \"Supports building both individual agents and multi-agent teams. Platform-focused abstraction.\"
    },
    {
      \"source\": \"https://prometai.app/blog/solopreneur-tech-stack-2026\",
      \"key_point\": \"Solopreneur AI stack shows functional department automation: Claude Projects (strategy), Lovable (dev), MidJourney (design), Perplexity (research), Make.com (automation), Clay.com (sales)\",
      \"evidence\": \"Solo founders using AI agents for each business function. Cost $3-12K/year vs traditional teams. Prompt chains (multi-step workflows) critical. Works at 6-7 figure revenue without teams.\"
    },
    {
      \"source\": \"https://www.anthropic.com/product/claude-code\",
      \"key_point\": \"Anthropic's Claude Managed Agents with multi-agent orchestration - lead agent delegates to specialists working in parallel\",
      \"evidence\": \"End-to-end platform for state/execution graphs/routing. Pre-built configurable harness. Read files, run commands, browse web, execute code securely. Netflix deployed for multiagent orchestration. Dreaming feature for self-improvement through memory review.\"
    },
    {
      \"source\": \"https://github.com/naimkatiman/Ai-agency\",
      \"key_point\": \"Framework built on latest OpenAI Assistants API - production-ready agent orchestration\",
      \"evidence\": \"Designed for reliability and production deployment. Leverages Assistants API for agent management.\"
    },
    {
      \"source\": \"https://github.com/akj2018/Multi-AI-Agent-Systems-with-crewAI\",
      \"key_point\": \"Reference implementation showing CrewAI for business workflows: resume tailoring, website design, customer support, research\",
      \"evidence\": \"Demonstrates department-style agent roles (domain-specific experts) collaborating on multi-step tasks. Educational examples for business automation.\"
    },
    {
      \"source\": \"https://www.deeplearning.ai/short-courses/multi-ai-agent-systems-with-crewai\",
      \"key_point\": \"Official course showing CrewAI agents for business consultant, market analyst, technologist evaluating startup ideas\",
      \"evidence\": \"Multi-agent collaboration on business planning. Demonstrates how specialized agents with different expertise collaborate.\"
    }
  ],
  \"recommendation\": \"For A-Team, prioritize absorption of: (1) ChatDev v2.0's YAML-based dynamic orchestration and 1000+ agent scalability over fixed roles, (2) Agency Agents' 13-division taxonomy for reference (Engineering/Marketing/Sales/Product/QA/Support/Finance), (3) Claude Code's native multi-agent teams for parallel execution without subprocess overhead, (4) MetaGPT's SOP-based philosophy for structured role collaboration, (5) Microsoft TinyTroupe's persona-based simulation for market testing without real deployments. Skip voice-specific (Vapi) and pure research (CAMEL) unless those are explicit targets. LangChain Deep Agents good for general task decomposition.\",
  \"alternatives\": [
    \"Use CrewAI instead of custom orchestration if Python-only constraint acceptable\",
    \"Adopt Claude Managed Agents as infrastructure layer vs building custom agent spawning logic\",
    \"Reference Agency Agents' 13-division taxonomy but build custom agent definitions (avoid direct fork due to license/maintenance burden)\",
    \"Integrate TinyTroupe for synthetic market validation before real campaign deployment\",
    \"Use CAMEL's scaling research for understanding million-agent behaviors if building platform-scale system\"
  ],
  \"risks\": [
    \"ChatDev v2.0 is very new (2026); unclear production stability vs v1.0 fixed roles. Recommend conservative adoption with feature flags.\",
    \"Agency Agents has 147 agents - significant maintenance surface. Tailor to A-Team's actual divisions rather than wholesale adoption.\",
    \"Claude Code agent teams are experimental feature (v2.1.32+); may break on version upgrades. Requires Opus 4.6 access (cost implications).\",
    \"MetaGPT's SOP-based approach requires deep SOPs documentation upfront - upfront cost but long-term reuse gain.\",
    \"LLM provider costs scale with agent count. 100+ agents × multi-turn conversations = significant budget. Build metering early.\",
    \"Token context limits (even with extended context) constrain team size. Large teams (50+) need state management/compression strategy.\",
    \"No framework dominates for non-code business functions (design, marketing creative). May need human-in-loop for quality gates.\",
    \"Persona-based agents (TinyTroupe) good for testing, not primary automation (still produces synthetic outputs needing validation).\"
  ],
  \"confidence\": \"high\",
  \"next_steps\": [
    \"Deep dive into ChatDev v2.0's YAML orchestration design (study puppeteer branch for NeurIPS 2025 work)\",
    \"Audit Agency Agents' 13 divisions against A-Team's actual current function map (research, design, implementation, etc.)\",
    \"Prototype Claude Code multi-agent teams with 3-5 agents on A-Team's existing /pickup workflow\",
    \"Catalog MetaGPT's SOP definitions to see if reusable for A-Team (PM → Designer → Coder → Reviewer pipeline as test)\",
    \"Evaluate TinyTroupe for market/product validation flows (e.g., '100 personas review PRD' before launch)\",
    \"Cost model: map estimated agent turns per workflow × token budget for 2026\",
    \"Decision: In-house orchestration vs adopt pre-built framework (recommend: adopt Claude Code native + CrewAI for Python workloads, avoid ChatDev fork tax)\"
  ]
}
```

---

## Sources

### Framework Repositories (Main)
- [MetaGPT - Multi-Agent Framework: First AI Software Company](https://github.com/FoundationAgents/MetaGPT)
- [ChatDev 2.0 - Multi-Agent Dev Collaboration Platform](https://github.com/OpenBMB/ChatDev)
- [CrewAI - Role-Playing Autonomous AI Agents Framework](https://github.com/crewAIInc/crewAI)
- [Agency Agents - Complete AI Agency with 147+ Specialized Agents](https://github.com/msitarzewski/agency-agents)
- [CAMEL - Multi-Agent Framework for Scaling Laws](https://github.com/camel-ai/camel)
- [PraisonAI - 24/7 AI Workforce Framework](https://github.com/MervinPraison/PraisonAI)
- [Agent Squad - Multi-Agent Orchestration with SupervisorAgent](https://github.com/2FastLabs/agent-squad)
- [AgentVerse - Task-Solving & Simulation Framework](https://github.com/OpenBMB/AgentVerse)
- [Microsoft TinyTroupe - Persona-Based Agent Simulation](https://github.com/microsoft/TinyTroupe)
- [Microsoft Agent Framework - Enterprise Multi-Language Framework](https://github.com/microsoft/agent-framework)
- [elizaOS/the-org - Organizational Agents](https://github.com/elizaOS/the-org)

### Documentation & Implementation Guides
- [Claude Code Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams)
- [LangChain Deep Agents Framework](https://github.com/langchain-ai/deepagents)
- [CrewAI Business Applications - Marketing Research](https://dev.to/jamesli/building-an-intelligent-marketing-research-system-creating-a-multi-agent-collaboration-framework-h66)
- [Multi-AI Agent Systems with CrewAI Course](https://www.deeplearning.ai/short-courses/multi-ai-agent-systems-with-crewai)
- [Business Planning with CrewAI Agents](https://medium.com/@therobbrennan/use-ai-agents-to-collaborate-and-create-a-business-plan-for-a-proposed-product-92004cc19ea1)

### Enterprise & Production
- [Anthropic Claude Managed Agents Overview](https://www.anthropic.com/product/claude-code)
- [Anthropic Engineering - Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)
- [Claude API Managed Agents Docs](https://platform.claude.com/docs/en/managed-agents/overview)

### Solopreneur & Business Context
- [The Solopreneur AI Tech Stack 2026](https://prometai.app/blog/solopreneur-tech-stack-2026)
- [AI Solopreneur Stack - One-Person Company](https://medium.com/@muhammadwaniai/the-ai-solopreneur-stack-how-i-run-a-one-person-business-like-a-10-person-team-1f873111c1fe)
- [How AI Creates $1B One-Person Company](https://orbilontech.com/ai-automation-1b-one-person-company/)

### Voice & Specialized Agents
- [Vapi - Advanced Voice AI Agents Platform](https://vapi.ai/)
- [ElevenLabs vs Vapi Voice AI Comparison 2026](https://www.goodcall.com/voice-ai/vapi-vs-elevenlabs)"
  }
]
