export const AROUTER_BASE_URL = "https://arouter.alterdev.site/v1";
export const AROUTER_RAW_HOST = "https://arouter.alterdev.site";
export const TELEGRAM_URL = "https://t.me/abnosleep";

export const DOCS_TOOLS = [
  {
    id: "claude-code",
    name: "Claude Code",
    icon: "terminal",
    setupType: "Managed config",
    configPath: "~/.claude/settings.json",
    summary:
      "Install Claude Code CLI, then point ANTHROPIC_BASE_URL to ARouter and set model aliases in ~/.claude/settings.json.",
    installCommand: "npm install -g @anthropic-ai/claude-code",
    steps: [
      "Install Claude Code and run `claude` once to verify the CLI is available.",
      `Set \`ANTHROPIC_BASE_URL\` to \`${AROUTER_BASE_URL}\` and \`ANTHROPIC_AUTH_TOKEN\` to your ARouter API key.`,
      "Optionally map the default opus, sonnet, and haiku model variables to your chosen ARouter model paths.",
    ],
    snippets: [
      {
        language: "json",
        filename: "~/.claude/settings.json",
        code: `{
  "hasCompletedOnboarding": true,
  "env": {
    "ANTHROPIC_BASE_URL": "${AROUTER_BASE_URL}",
    "ANTHROPIC_AUTH_TOKEN": "<Your Key>",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "<Model-ID>",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "<Model-ID>",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "<Model-ID>"
  }
}`,
      },
    ],
    tags: ["claude", "anthropic", "cli", "settings.json"],
  },
  {
    id: "codex-cli",
    name: "OpenAI Codex CLI",
    icon: "terminal",
    setupType: "Managed config",
    configPath: "~/.codex/config.toml + ~/.codex/auth.json",
    summary:
      "Codex uses a provider block in ~/.codex/config.toml plus an API key in ~/.codex/auth.json.",
    installCommand: "npm install -g @openai/codex",
    steps: [
      "Install Codex CLI and verify with `codex`.",
      `Set \`base_url\` to \`${AROUTER_BASE_URL}\` inside the \`model_providers.ARouter\` block and keep \`wire_api = "responses"\`.`,
      "Store `OPENAI_API_KEY` in `~/.codex/auth.json`, then set your main model and optional subagent model.",
    ],
    snippets: [
      {
        language: "toml",
        filename: "~/.codex/config.toml",
        code: `model = "gpt-5.5"
model_provider = "ARouter"
sandbox_mode = "danger-full-access"
model_reasoning_effort = "xhigh"

[model_providers.ARouter]
name = "ARouter"
base_url = "${AROUTER_BASE_URL}"
wire_api = "responses"

[agents.subagent]
model = "cx/gpt-5.3-codex"`,
      },
      {
        language: "json",
        filename: "~/.codex/auth.json",
        code: `{
  "auth_mode": "apikey",
  "OPENAI_API_KEY": ""
}`,
      },
    ],
    tags: ["codex", "openai", "config.toml", "auth.json"],
  },
  {
    id: "opencode",
    name: "OpenCode",
    icon: "terminal",
    setupType: "Managed config",
    configPath: "~/.config/opencode/opencode.json",
    summary:
      "OpenCode stores provider and model configuration in ~/.config/opencode/opencode.json.",
    installCommand: "npm install -g opencode-ai",
    steps: [
      "Install OpenCode and verify the CLI is available.",
      `Create a provider named \`arouter\` that uses the OpenAI-compatible SDK with \`baseURL = ${AROUTER_BASE_URL}\`.`,
      "Attach your ARouter API key, register one or more models, and optionally set a subagent explorer model.",
    ],
    snippets: [
      {
        language: "json",
        filename: "~/.config/opencode/opencode.json",
        code: `{
  "provider": {
    "arouter": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "${AROUTER_BASE_URL}",
        "apiKey": "YOUR_AROUTER_API_KEY"
      }
    }
  },
  "model": "arouter/provider/model-id"
}`,
      },
    ],
    tags: ["opencode", "openai-compatible", "json"],
  },
  {
    id: "open-claw",
    name: "Open Claw",
    icon: "terminal",
    setupType: "Managed config",
    configPath: "~/.openclaw/openclaw.json",
    summary:
      "Open Claw uses ~/.openclaw/openclaw.json and can map a default model plus per-agent overrides.",
    steps: [
      `Define provider \`arouter\` with \`baseUrl = ${AROUTER_BASE_URL}\` and your ARouter API key.`,
      "Set the default agent model to `arouter/provider/model-id`.",
      "If needed, override individual agent models for specific workflows.",
    ],
    snippets: [
      {
        language: "json",
        filename: "~/.openclaw/openclaw.json",
        code: `{
  "agents": {
    "defaults": {
      "model": {
        "primary": "arouter/provider/model-id"
      }
    }
  },
  "models": {
    "providers": {
      "arouter": {
        "baseUrl": "${AROUTER_BASE_URL}",
        "apiKey": "YOUR_AROUTER_API_KEY"
      }
    }
  }
}`,
      },
    ],
    tags: ["open claw", "openclaw", "json"],
  },
  {
    id: "factory-droid",
    name: "Factory Droid",
    icon: "terminal",
    setupType: "Managed config",
    configPath: "~/.factory/settings.json",
    summary:
      "Factory Droid writes a custom model entry in ~/.factory/settings.json or %USERPROFILE%\\\\.factory\\\\settings.json.",
    steps: [
      `Add a custom model entry whose \`baseUrl\` is \`${AROUTER_BASE_URL}\`.`,
      "Use your ARouter API key in the `apiKey` field.",
      "Set the model field to the routed model path you want the tool to call.",
    ],
    snippets: [
      {
        language: "json",
        filename: "~/.factory/settings.json",
        code: `{
  "customModels": [
    {
      "model": "provider/model-id",
      "id": "custom:ARouter-0",
      "baseUrl": "${AROUTER_BASE_URL}",
      "apiKey": "YOUR_AROUTER_API_KEY",
      "provider": "openai"
    }
  ]
}`,
      },
    ],
    tags: ["factory droid", "custom model", "settings"],
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "terminal",
    setupType: "Guide-based setup",
    configPath: "Cursor Settings > Models",
    summary:
      "Cursor uses the custom OpenAI API flow and expects an externally reachable endpoint.",
    steps: [
      "Open Cursor Settings and go to Models.",
      `Enable the OpenAI API key option, then set Base URL to \`${AROUTER_BASE_URL}\`.`,
      "Paste your ARouter API key and add a custom model path.",
    ],
    notes: [
      {
        type: "info",
        text: "The current setup flow marks Cursor as requiring an external URL rather than localhost.",
      },
    ],
    tags: ["cursor", "models", "openai api"],
  },
  {
    id: "cline-kilo-roo",
    name: "Cline / Kilo Code / Roo",
    icon: "terminal",
    setupType: "OpenAI-compatible guide",
    configPath: "Tool settings panel",
    summary:
      "These tools mainly need provider selection, base URL, API key, and a model path.",
    steps: [
      "Open each tool's settings panel.",
      "Choose an OpenAI-compatible provider. Roo may follow an Ollama-style path depending on the client build.",
      `Set Base URL to \`${AROUTER_BASE_URL}\` for Cline and Kilo, or \`${AROUTER_RAW_HOST}\` for Roo if the client expects the raw host.`,
      "Paste the API key and select your routed model path.",
    ],
    notes: [
      {
        type: "info",
        text: "If Roo accepts the full OpenAI-compatible path directly, use the /v1 endpoint first. Fall back to the raw host only when the client rejects it.",
      },
    ],
    tags: ["cline", "kilo", "roo", "openai-compatible"],
  },
  {
    id: "continue",
    name: "Continue",
    icon: "terminal",
    setupType: "Config file",
    configPath: "Continue config file",
    summary:
      "Continue expects an OpenAI provider model object in its configuration file.",
    steps: [
      "Open the Continue configuration file.",
      `Add an OpenAI model object whose \`apiBase\` points to \`${AROUTER_BASE_URL}\`.`,
      "Fill in the ARouter API key and the model path you want to route.",
    ],
    snippets: [
      {
        language: "json",
        filename: "continue config",
        code: `{
  "apiBase": "${AROUTER_BASE_URL}",
  "title": "provider/model-id",
  "model": "provider/model-id",
  "provider": "openai",
  "apiKey": "YOUR_AROUTER_API_KEY"
}`,
      },
    ],
    tags: ["continue", "openai", "config"],
  },
  {
    id: "mitm-tools",
    name: "Antigravity / Copilot / Kiro",
    icon: "terminal",
    setupType: "MITM flow",
    configPath: "Dashboard > CLI Tools > MITM",
    summary:
      "These tools do not follow the normal custom-provider path. The current product routes them through the MITM-oriented setup inside the dashboard.",
    steps: [
      "Open the MITM tools section and start the MITM service with the required system permissions.",
      "Accept certificate and DNS/network changes required by the tool-specific flow.",
      "Select an ARouter API key and map each exposed alias to the upstream model route you want.",
    ],
    notes: [
      {
        type: "info",
        text: "This mirrors the intent of the current CLI Tools tab, where MITM tools link to a separate flow instead of using the same generic setup card.",
      },
    ],
    tags: ["mitm", "antigravity", "copilot", "kiro"],
  },
  {
    id: "hermes-agent",
    name: "Hermes Agent",
    icon: "terminal",
    setupType: "Managed config",
    configPath: "~/.hermes/config.yaml + ~/.hermes/.env",
    summary:
      "Hermes Agent uses a configuration block in ~/.hermes/config.yaml plus an API key in ~/.hermes/.env.",
    installCommand:
      "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash",
    steps: [
      "Install Hermes Agent and ensure the CLI is available.",
      `Set \`base_url\` to \`${AROUTER_BASE_URL}\` and \`provider: "custom"\` in \`~/.hermes/config.yaml\`.`,
      "Store `OPENAI_API_KEY` in `~/.hermes/.env`.",
    ],
    snippets: [
      {
        language: "yaml",
        filename: "~/.hermes/config.yaml",
        code: `model:
  default: "provider/model-id"
  provider: "custom"
  base_url: "${AROUTER_BASE_URL}"`,
      },
      {
        language: "bash",
        filename: "~/.hermes/.env",
        code: "OPENAI_API_KEY=YOUR_AROUTER_API_KEY",
      },
    ],
    tags: ["hermes", "yaml", "env"],
  },
];
