#!/usr/bin/env node
/**
 * MCP Privileged Executor
 *
 * Claude Code의 Bash 승인을 우회하여 명령 실행.
 * 보안 blocklist로 위험 명령만 차단.
 *
 * 설치:
 *   ~/.claude/settings.json의 mcpServers에 추가
 *
 * 사용:
 *   mcp__privileged-executor__exec({ command: "git status", cwd: "/path" })
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

// ═══════════════════════════════════════════════════════════════
// 보안 설정
// ═══════════════════════════════════════════════════════════════

// 절대 실행 금지 (정규식)
const BLOCKLIST = [
  // 파일시스템 파괴
  /rm\s+(-rf?|--recursive)\s+[\/~]/i,          // rm -rf / or ~
  /rm\s+(-rf?|--recursive)\s+\.\./i,           // rm -rf ..
  />\s*\/dev\/sd[a-z]/i,                        // direct device write
  /dd\s+.*of=\/dev/i,                           // dd to device
  /mkfs/i,                                       // format filesystem
  /wipefs/i,                                     // wipe filesystem

  // Fork bomb / 시스템 공격
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/,  // fork bomb
  /while\s+true.*do.*done/i,                     // infinite loop

  // 권한 상승
  /chmod\s+777\s+\//i,                           // chmod 777 /
  /chown\s+.*\s+\//i,                            // chown /

  // 네트워크 공격 도구
  /nmap\s+-sS/i,                                 // SYN scan
  /hping3/i,                                     // packet crafting

  // 암호화폐 채굴
  /xmrig|cryptonight|minerd/i,

  // 환경 오염
  /export\s+PATH=["']?$/i,                       // PATH 삭제
  /unset\s+PATH/i,
];

// 경고 후 실행 (로그에 기록)
const WARNLIST = [
  /curl.*\|\s*(ba)?sh/i,                         // curl | bash
  /wget.*\|\s*(ba)?sh/i,                         // wget | bash
  /sudo/i,                                        // sudo 사용
  />\s*\/etc\//i,                                // /etc 쓰기
  /ssh\s+-o\s+StrictHostKeyChecking=no/i,       // SSH 검증 비활성화
];

// 허용 경로 (이 외 경로는 경고)
const ALLOWED_PATHS = [
  homedir(),
  "/tmp",
  "/private/tmp",
  "/opt/homebrew",
  "/usr/local",
];

// ═══════════════════════════════════════════════════════════════
// 로깅
// ═══════════════════════════════════════════════════════════════

const LOG_DIR = join(homedir(), ".ateam", "logs");
const LOG_FILE = join(LOG_DIR, "privileged-exec.jsonl");

if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

function log(entry) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...entry
  }) + "\n";
  try {
    appendFileSync(LOG_FILE, line);
  } catch (e) {
    // 로깅 실패해도 계속 진행
  }
}

// ═══════════════════════════════════════════════════════════════
// 보안 체크
// ═══════════════════════════════════════════════════════════════

function checkSecurity(command, cwd) {
  // Blocklist 체크
  for (const pattern of BLOCKLIST) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: `BLOCKED: Matches security blocklist pattern`,
        pattern: pattern.toString()
      };
    }
  }

  // Warnlist 체크
  const warnings = [];
  for (const pattern of WARNLIST) {
    if (pattern.test(command)) {
      warnings.push(pattern.toString());
    }
  }

  // 경로 체크
  let pathWarning = null;
  if (cwd && !ALLOWED_PATHS.some(p => cwd.startsWith(p))) {
    pathWarning = `Working directory ${cwd} is outside allowed paths`;
  }

  return {
    allowed: true,
    warnings,
    pathWarning
  };
}

// ═══════════════════════════════════════════════════════════════
// MCP 서버
// ═══════════════════════════════════════════════════════════════

const server = new Server({
  name: "privileged-executor",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "exec",
      description: "Execute shell command with auto-approval. Dangerous commands are blocked by security blocklist. All executions are logged.",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command to execute"
          },
          cwd: {
            type: "string",
            description: "Working directory (defaults to home)"
          },
          timeout: {
            type: "number",
            description: "Timeout in ms (default: 120000, max: 600000)"
          },
          shell: {
            type: "string",
            description: "Shell to use (default: /bin/bash)",
            enum: ["/bin/bash", "/bin/zsh", "/bin/sh"]
          }
        },
        required: ["command"]
      }
    },
    {
      name: "exec_stream",
      description: "Execute command with streaming output (for long-running commands)",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string" },
          cwd: { type: "string" },
          timeout: { type: "number" }
        },
        required: ["command"]
      }
    },
    {
      name: "blocklist",
      description: "Show current security blocklist patterns",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "exec":
      return await handleExec(args);
    case "exec_stream":
      return await handleExecStream(args);
    case "blocklist":
      return handleBlocklist();
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true
      };
  }
});

async function handleExec({ command, cwd, timeout = 120000, shell = "/bin/bash" }) {
  // 기본값
  cwd = cwd || homedir();
  timeout = Math.min(timeout, 600000); // 최대 10분

  // 보안 체크
  const security = checkSecurity(command, cwd);

  if (!security.allowed) {
    log({ action: "BLOCKED", command, cwd, reason: security.reason });
    return {
      content: [{
        type: "text",
        text: `🚫 ${security.reason}\n\nPattern: ${security.pattern}\n\nThis command is on the security blocklist and cannot be executed.`
      }],
      isError: true
    };
  }

  // 경고 로깅
  if (security.warnings.length > 0 || security.pathWarning) {
    log({
      action: "WARN",
      command,
      cwd,
      warnings: security.warnings,
      pathWarning: security.pathWarning
    });
  }

  // 실행
  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      shell,
      env: { ...process.env, TERM: "dumb" }
    });

    const duration = Date.now() - startTime;

    log({
      action: "SUCCESS",
      command: command.substring(0, 200),
      cwd,
      exitCode: 0,
      duration,
      stdoutLen: stdout.length,
      stderrLen: stderr.length
    });

    let output = "";
    if (stdout) output += stdout;
    if (stderr) output += (output ? "\n\n--- stderr ---\n" : "") + stderr;
    if (!output) output = "(no output)";

    // 경고 표시
    let prefix = "";
    if (security.warnings.length > 0) {
      prefix = `⚠️ Warnings: ${security.warnings.join(", ")}\n\n`;
    }

    return {
      content: [{
        type: "text",
        text: `${prefix}${output}\n\n---\n_exit: 0 | ${duration}ms_`
      }]
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    log({
      action: "ERROR",
      command: command.substring(0, 200),
      cwd,
      exitCode: error.code,
      duration,
      error: error.message?.substring(0, 500)
    });

    let output = "";
    if (error.stdout) output += error.stdout;
    if (error.stderr) output += (output ? "\n\n--- stderr ---\n" : "") + error.stderr;
    if (!output) output = error.message || "Unknown error";

    return {
      content: [{
        type: "text",
        text: `${output}\n\n---\n_exit: ${error.code || 1} | ${duration}ms_`
      }]
    };
  }
}

async function handleExecStream({ command, cwd, timeout = 300000 }) {
  cwd = cwd || homedir();
  timeout = Math.min(timeout, 600000);

  const security = checkSecurity(command, cwd);
  if (!security.allowed) {
    return {
      content: [{ type: "text", text: `🚫 ${security.reason}` }],
      isError: true
    };
  }

  return new Promise((resolve) => {
    const chunks = [];
    const child = spawn(command, {
      cwd,
      shell: "/bin/bash",
      env: { ...process.env, TERM: "dumb" }
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({
        content: [{
          type: "text",
          text: chunks.join("") + "\n\n---\n_TIMEOUT after ${timeout}ms_"
        }]
      });
    }, timeout);

    child.stdout.on("data", (data) => chunks.push(data.toString()));
    child.stderr.on("data", (data) => chunks.push(data.toString()));

    child.on("close", (code) => {
      clearTimeout(timer);
      log({ action: "STREAM_DONE", command: command.substring(0, 100), exitCode: code });
      resolve({
        content: [{
          type: "text",
          text: `${chunks.join("")}\n\n---\n_exit: ${code}_`
        }]
      });
    });
  });
}

function handleBlocklist() {
  const patterns = BLOCKLIST.map(p => `- ${p.toString()}`).join("\n");
  const warns = WARNLIST.map(p => `- ${p.toString()}`).join("\n");

  return {
    content: [{
      type: "text",
      text: `# Security Blocklist\n\n## Blocked (will not execute):\n${patterns}\n\n## Warnings (will execute but log):\n${warns}\n\n## Allowed Paths:\n${ALLOWED_PATHS.map(p => `- ${p}`).join("\n")}\n\n## Log File:\n${LOG_FILE}`
    }]
  };
}

// 시작
const transport = new StdioServerTransport();
await server.connect(transport);
