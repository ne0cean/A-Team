# Research: License Compliance Tools
> Date: 2026-05-11

Now I have comprehensive data. Let me compile the structured research response.

```json
{
  "task_id": "license-compliance-research",
  "status": "DONE",
  "question": "Which npm license compliance tool is best for Node.js/TypeScript projects, and what are the best SaaS legal templates?",
  "summary": "For npm license compliance, license-checker-rseidelsohn is the best choice (191 GitHub stars, 122k weekly downloads, actively maintained as of Jan 2025). For SaaS legal templates, use the curated awesome-legal GitHub repository which links to law firm templates from Y Combinator, Orrick, and Cooley. For formal commercial policies, Termly or iubenda are industry-standard generators.",
  "findings": [
    {
      "source": "https://github.com/RSeidelsohn/license-checker-rseidelsohn",
      "key_point": "RECOMMENDED: license-checker-rseidelsohn is the most actively maintained fork with strong adoption",
      "evidence": "191 GitHub stars, last commit Jan 14 2025, 122,371 weekly npm downloads. Maintainer committed to '10% Fridays' support schedule. 4.4.2 latest version shows ongoing updates."
    },
    {
      "source": "https://www.npmjs.com/package/license-checker-rseidelsohn",
      "key_point": "Actively maintained with recent updates",
      "evidence": "Latest version 4.4.2, regular release cadence documented in changelog. Significantly ahead of original license-checker (1,678 stars, no updates since 2019)."
    },
    {
      "source": "https://npmtrends.com/license-checker-vs-license-report-vs-npm-license-crawler",
      "key_point": "license-checker-rseidelsohn leads in downloads among maintained tools",
      "evidence": "122,371 weekly downloads vs license-report (69,420). Original license-checker still has ~700k downloads due to legacy adoption but abandoned since 2019."
    },
    {
      "source": "https://github.com/greenstevester/license-checker-evergreen",
      "key_point": "license-checker-evergreen exists as alternative TypeScript-focused fork",
      "evidence": "Only 6 GitHub stars, limited adoption compared to rseidelsohn. Emphasizes TypeScript support but minimal industry adoption metrics visible."
    },
    {
      "source": "https://github.com/franciscop/legally",
      "key_point": "Alternative lightweight tool with moderate adoption",
      "evidence": "421 GitHub stars, 143 total commits, 22 forks. Simpler API-focused approach. Less detailed filtering than license-checker-rseidelsohn."
    },
    {
      "source": "https://npmtrends.com/license-checker-vs-license-report-vs-npm-license-crawler",
      "key_point": "GPL/AGPL detection supported across tools",
      "evidence": "license-checker-rseidelsohn, license-checker, and license-report all detect copyleft licenses. 7.3% of npm packages have GPL/AGPL contamination risks."
    },
    {
      "source": "https://appsecsanta.com/sca-tools/open-source-license-compliance",
      "key_point": "Enterprise tools also support GPL/AGPL flagging",
      "evidence": "FOSSA, Snyk, Black Duck can block GPL/AGPL in CI/CD pipelines. Commercial alternative if budget allows."
    },
    {
      "source": "https://github.com/RSeidelsohn/license-checker-rseidelsohn/blob/master/README.md",
      "key_point": "Supports multiple output formats but NOT native NOTICE file generation",
      "evidence": "Supports JSON, CSV, Markdown, custom formats. --files flag copies license.txt files. No built-in NOTICE or attribution document generation."
    },
    {
      "source": "https://www.npmjs.com/package/generate-license-file",
      "key_point": "Complementary tool for generating NOTICE/attribution files",
      "evidence": "Version 4.1.1, last updated 5 months ago. Generates third-party-licenses.txt. Can be used in combination with license-checker for complete compliance workflow."
    },
    {
      "source": "https://github.com/ankane/awesome-legal",
      "key_point": "RECOMMENDED: Curated source for reputable SaaS legal templates",
      "evidence": "Links to law firm templates from Y Combinator, Orrick (major law firm), Cooley (startup-focused), UPenn ELC, Common Paper. Emphasizes plain language documents."
    },
    {
      "source": "https://www.termsfeed.com/blog/sample-saas-privacy-policy-template/",
      "key_point": "TermsFeed provides free SaaS-specific templates",
      "evidence": "Free generator, easy setup. Less comprehensive than legal-reviewed alternatives but good starting point."
    },
    {
      "source": "https://cybernews.com/privacy-compliance-tools/termly-vs-iubenda/",
      "key_point": "Termly vs iubenda: Commercial generators with reputation metrics",
      "evidence": "Termly: 3.6/5 on WordPress, questionnaire-driven (easy for non-technical). iubenda: 4.7/5 on Capterra, used by 150k+ businesses, modular approach (steeper learning curve, better for GDPR/CCPA multi-region)."
    },
    {
      "source": "https://termly.io/resources/compare/termly-vs-iubenda/",
      "key_point": "Comparison of commercial solutions for SaaS compliance",
      "evidence": "Termly: Fast setup but limited multi-region support. iubenda: Complex UI but comprehensive (privacy policy + cookie consent + T&C + accessibility in one subscription)."
    },
    {
      "source": "https://github.com/tangro/actions-license-check",
      "key_point": "Pre-built GitHub Action for CI/CD integration",
      "evidence": "tangro/actions-license-check wraps license-checker with --production --json --onlyAllow filters. Can be integrated directly into GitHub Actions workflows."
    },
    {
      "source": "https://github.com/pre-commit/action",
      "key_point": "Pre-commit hook integration available",
      "evidence": "Pre-commit framework action on GitHub Marketplace. Can wrap license-checker-rseidelsohn as local pre-commit hook via .pre-commit-hooks.yaml."
    }
  ],
  "recommendation": "**For npm License Compliance**: Use license-checker-rseidelsohn as primary tool. It's actively maintained (Jan 2025), has highest adoption among maintained forks (122k weekly downloads), and supports GPL/AGPL detection. Pair it with generate-license-file if you need NOTICE/attribution file generation. Integrate via `npm run license-check` script + GitHub Actions (tangro/actions-license-check) or pre-commit hook.

**For SaaS Legal Templates**: Start with awesome-legal GitHub repository which curates templates from reputable law firms (Y Combinator, Orrick, Cooley). For production systems, use either Termly (if quick setup for single-region) or iubenda (if multi-region GDPR/CCPA compliance needed). Both are industry-standard, but iubenda has better reputation (4.7/5 vs 3.6/5).",
  "alternatives": [
    "license-checker (original davglass fork): 1,678 stars but abandoned since 2019 — DO NOT USE for new projects despite 700k legacy downloads",
    "legally: Lightweight alternative (421 stars) if you prefer simpler API, but less feature-complete than rseidelsohn",
    "license-report: Alternative with 69k weekly downloads, supports similar output formats",
    "Commercial SCA tools (Snyk, FOSSA, Black Duck): Enterprise option with wider compliance scanning if GPL detection at scale is critical"
  ],
  "risks": [
    "license-checker-rseidelsohn outputs JSON/CSV/Markdown but does NOT generate NOTICE files — must chain with generate-license-file if formal attribution is required",
    "7.3% of npm packages have GPL/AGPL contamination risk — configure --excludeLicenses or --onlyAllow in CI/CD to fail builds early",
    "Termly and iubenda templates are auto-generated starting points — legal review by attorney recommended before deployment (they are not lawyer-drafted, but generated from your answers)",
    "awesome-legal templates include disclaimer: 'for informational purposes only' — use as reference, not as legal advice without attorney review",
    "GPL copyleft clauses can require you to open-source your entire app if you distribute it — this is not just an npm advisory, it's a legal obligation for some use cases"
  ],
  "confidence": "high",
  "next_steps": [
    "npm install license-checker-rseidelsohn --save-dev && add --onlyAllow='MIT,Apache-2.0,BSD-2-Clause,ISC' to your .npmrc or package.json scripts",
    "npm install generate-license-file --save-dev for NOTICE file generation if compliance reporting is needed",
    "Add GitHub Action: tangro/actions-license-check or wrap license-checker-rseidelsohn in custom workflow step",
    "For SaaS legal: (a) Start with awesome-legal repo templates as reference, (b) if budget allows, use iubenda for multi-region compliance or Termly for quick setup",
    "Document your 'approved license list' in .github/license-policy.json or COMPLIANCE.md for team transparency",
    "Quarterly audit: run license-checker-rseidelsohn --production to catch new transitive dependencies"
  ]
}
```

## Implementation Guide

### npm License Checker Setup

**Installation & CI/CD Integration:**
```
npm install --save-dev license-checker-rseidelsohn generate-license-file
```

**Script in package.json:**
```json
"scripts": {
  "license-check": "license-checker-rseidelsohn --onlyAllow 'MIT,Apache-2.0,BSD-2-Clause,ISC' --production",
  "license-report": "generate-license-file --input package.json --output NOTICE.txt"
}
```

**GitHub Actions workflow** (use tangro/actions-license-check):
```yaml
name: License Check
on: [pull_request]
jobs:
  license-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - uses: tangro/actions-license-check@v1
        with:
          onlyAllow: MIT,Apache-2.0,BSD-2-Clause,ISC
```

---

## Key Distinctions Between Tools

| Tool | GitHub Stars | Weekly Downloads | Maintenance | Best For |
|------|------|------|------|------|
| **license-checker-rseidelsohn** ⭐ | 191 | 122k | Jan 2025 (Active) | Production projects needing GPL/AGPL detection |
| license-checker (original) | 1,678 | 700k | Abandoned 2019 | Legacy codebases only |
| legally | 421 | — | Moderate | Lightweight teams, simple use cases |
| license-report | — | 69k | Active | Alternative, less adopted |

---

## SaaS Legal Templates: Law Firm Sources

**awesome-legal GitHub curates these reputable sources:**
- **Y Combinator**: Sales agreements, standard T&C
- **Orrick**: Employee, consulting, advisor templates
- **Cooley**: California-focused startup documents
- **UPenn ELC**: Comprehensive startup kit
- **Common Paper**: Standardized Cloud Service & Professional Services Agreements

All marked as "for informational purposes only" — not substitutes for legal counsel.

---

## Commercial SaaS Legal Generators

**Termly (Easier Setup)**: 
- Questionnaire-driven
- 3.6/5 reputation on WordPress
- Good for single-region, non-technical users
- Limitation: weak multi-region GDPR/CCPA support

**iubenda (Comprehensive)**: 
- 4.7/5 on Capterra, 150k+ businesses
- One subscription = privacy policy + cookie consent + T&C + accessibility
- Better for complex multi-region compliance
- Limitation: steep learning curve, complex interface

Both are **generators**, not lawyer-drafted — review output before production use.

---

Sources:
- [GitHub - RSeidelsohn/license-checker-rseidelsohn](https://github.com/RSeidelsohn/license-checker-rseidelsohn)
- [NPM - license-checker-rseidelsohn](https://www.npmjs.com/package/license-checker-rseidelsohn)
- [GitHub - davglass/license-checker](https://github.com/davglass/license-checker)
- [GitHub - franciscop/legally](https://github.com/franciscop/legally)
- [GitHub - greenstevester/license-checker-evergreen](https://github.com/greenstevester/license-checker-evergreen)
- [GitHub - ankane/awesome-legal](https://github.com/ankane/awesome-legal)
- [NPM - generate-license-file](https://www.npmjs.com/package/generate-license-file)
- [GitHub - tangro/actions-license-check](https://github.com/tangro/actions-license-check)
- [AppSec Santa - License Compliance Scanner 2026](https://appsecsanta.com/sca-tools/open-source-license-compliance)
- [Cybernews - Termly vs iubenda 2026](https://cybernews.com/privacy-compliance-tools/termly-vs-iubenda/)
- [Termly - Compare Termly vs iubenda](https://termly.io/resources/compare/termly-vs-iubenda/)
- [TermsFeed - SaaS Privacy Policy Template](https://www.termsfeed.com/blog/sample-saas-privacy-policy-template/)
