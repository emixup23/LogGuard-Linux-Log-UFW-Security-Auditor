import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';
import { localHfEngine } from './server/localHfEngine';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `You are an expert Linux system administrator, IT security engineer, and log analysis assistant.
Your job is to analyze raw system logs, firewall audit trails, authentication logs (/var/log/auth.log, syslog, /var/log/ufw.log, journalctl, secure, fail2ban.log, nginx logs), or terminal/SIEM screenshots provided by the user.

When analyzing logs, you must:
1. Identify suspicious activities, failed login spikes, unauthorized access attempts, brute-force SSH, port scans (SYN/FIN/XMAS), privilege escalation, directory traversal, or protocol anomalies.
2. Extract relevant metadata (source IPs, timestamps, targeted services, ports, usernames, attack frequency).
3. Evaluate the risk level (LOW, MEDIUM, HIGH, CRITICAL).
4. Provide precise, production-safe remediation commands (such as Linux ufw firewall rules, csf, fail2ban configurations, and sshd_config hardening steps).
5. Always generate valid UFW syntax (e.g., 'sudo ufw insert 1 deny from <IP> to any comment \"LogGuard: SSH Brute Force\"', or 'sudo ufw limit ssh/tcp comment \"Rate limit SSH\"'). Ensure rules won't accidentally lock out typical private subnets unless clearly compromised.
6. CRITICAL FORMATTING: Whenever providing terminal commands or scripts, ALWAYS provide all sequential commands in ONE single contiguous code block (\`\`\`bash ... \`\`\`), never split across multiple disparate blocks, so the administrator can copy and run everything in one paste.`;

// Schema for structured threat audit
const auditResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Concise executive summary of the security audit and incident findings.",
    },
    overallRisk: {
      type: Type.STRING,
      description: "Overall threat risk level: LOW, MEDIUM, HIGH, or CRITICAL.",
    },
    logTypeDetected: {
      type: Type.STRING,
      description: "Identified log type (e.g., auth.log / SSH, UFW audit trail, Syslog, Web Server Access, Mixed / Unknown).",
    },
    totalEventsAnalyzed: {
      type: Type.INTEGER,
      description: "Estimated count of log lines or events parsed.",
    },
    attackVectors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of attack vectors observed (e.g. SSH Brute Force, Port Scan / SYN Probe, Invalid User Probing, Sudo Abuse).",
    },
    threats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          severity: { type: Type.STRING, description: "LOW, MEDIUM, HIGH, or CRITICAL" },
          attackVector: { type: Type.STRING },
          description: { type: Type.STRING },
          sourceIps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          targetedPorts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          targetedUsers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          frequency: { type: Type.STRING, description: "e.g., 84 attempts in 12 minutes" },
          evidenceLogLines: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Direct log snippets proving this threat.",
          },
          recommendedAction: { type: Type.STRING },
        },
        required: ["id", "title", "severity", "attackVector", "description", "sourceIps", "recommendedAction"],
      },
    },
    suspiciousIps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ip: { type: Type.STRING },
          attemptCount: { type: Type.INTEGER },
          riskScore: { type: Type.INTEGER, description: "Risk score 1-100" },
          reputation: { type: Type.STRING, description: "e.g., Aggressive Brute-forcer, Public Scanner / Tor Exit Node" },
          targetedService: { type: Type.STRING },
          firstSeen: { type: Type.STRING },
          lastSeen: { type: Type.STRING },
          suggestedAction: { type: Type.STRING, description: "DENY, LIMIT, or MONITOR" },
        },
        required: ["ip", "attemptCount", "riskScore", "suggestedAction"],
      },
    },
    remediation: {
      type: Type.OBJECT,
      properties: {
        ufwRules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              command: { type: Type.STRING, description: "Exact ready-to-run bash command" },
              explanation: { type: Type.STRING },
              target: { type: Type.STRING },
              ruleNumber: { type: Type.INTEGER, description: "Optional rule priority" },
            },
            required: ["command", "explanation", "target"],
          },
        },
        fail2banConfig: {
          type: Type.OBJECT,
          properties: {
            jailLocalSnippet: { type: Type.STRING, description: "/etc/fail2ban/jail.local configuration snippet" },
            explanation: { type: Type.STRING },
            commands: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["jailLocalSnippet", "explanation"],
        },
        sshdConfig: {
          type: Type.OBJECT,
          properties: {
            recommendedSettings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            explanation: { type: Type.STRING },
            commands: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["recommendedSettings", "explanation"],
        },
        csfConfig: {
          type: Type.OBJECT,
          properties: {
            denyEntries: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            explanation: { type: Type.STRING },
          },
          required: ["denyEntries", "explanation"],
        },
        bashScript: {
          type: Type.STRING,
          description: "Full self-contained hardening bash script with error checking, backup of current rules, ufw application, and verification.",
        },
        immediateActions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Step-by-step immediate actions the sysadmin should take.",
        },
      },
      required: ["ufwRules", "fail2banConfig", "sshdConfig", "bashScript", "immediateActions"],
    },
  },
  required: [
    "summary",
    "overallRisk",
    "logTypeDetected",
    "totalEventsAnalyzed",
    "attackVectors",
    "threats",
    "suspiciousIps",
    "remediation",
  ],
};

// Helper function to extract JSON from raw text (handles markdown fences)
function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    cleaned = match[1].trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

// Hugging Face API caller
async function callHuggingFace({
  model,
  token,
  messages,
  responseFormatJson,
}: {
  model?: string;
  token?: string;
  messages: Array<{ role: string; content: string }>;
  responseFormatJson?: boolean;
}): Promise<string> {
  const hfToken = token || process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;
  if (!hfToken) {
    throw new Error(
      'Hugging Face API token is required. Please set HUGGINGFACE_API_TOKEN in your environment or enter your HF token in the provider settings.'
    );
  }

  const hfModel = model || process.env.HF_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';
  const url = 'https://router.huggingface.co/hf-inference/v1/chat/completions';

  const body: any = {
    model: hfModel,
    messages,
    temperature: 0.2,
    max_tokens: 4096,
  };

  if (responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfToken.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = errorText;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.error?.message || parsed.error || errorText;
    } catch {}
    throw new Error(`Hugging Face API Error (${response.status}): ${msg}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Hugging Face model returned an empty response.');
  }
  return content;
}

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'LogGuard API', timestamp: new Date().toISOString() });
});

// Local Hugging Face Model Status & On-Demand Loader
app.get('/api/local-hf/status', (_req, res) => {
  res.json(localHfEngine.getStatus());
});

app.post('/api/local-hf/load', async (_req, res) => {
  try {
    await localHfEngine.ensureModelLoaded();
    res.json({ success: true, status: localHfEngine.getStatus() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load local model' });
  }
});

// Providers Info Endpoint
app.get('/api/providers', (_req, res) => {
  res.json({
    localHf: localHfEngine.getStatus(),
    gemini: {
      available: !!process.env.GEMINI_API_KEY,
      defaultModel: 'gemini-3.8-flash',
    },
    huggingface: {
      hasEnvToken: !!(process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN),
      defaultModel: process.env.HF_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
    },
  });
});

// Test Hugging Face Connection Endpoint
app.post('/api/test-hf', async (req, res) => {
  try {
    const { token, model } = req.body;
    const testModel = model || process.env.HF_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';
    const testToken = token || process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;

    if (!testToken) {
      return res.status(400).json({
        success: false,
        error: 'No Hugging Face token provided or found in environment.',
      });
    }

    const reply = await callHuggingFace({
      model: testModel,
      token: testToken,
      messages: [
        { role: 'system', content: 'You are a test ping bot.' },
        { role: 'user', content: 'Reply with "OK" followed by your model name.' },
      ],
    });

    return res.json({
      success: true,
      message: `Connection successful with ${testModel}!`,
      reply: reply.slice(0, 150),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Connection test failed.',
    });
  }
});

// Analyze Log Endpoint (Supports Google Gemini or Hugging Face)
app.post('/api/analyze', async (req, res) => {
  try {
    const {
      logText,
      imageBase64,
      imageMimeType,
      logCategory,
      provider = 'gemini',
      hfModel,
      hfToken,
      whitelistIp,
      sshPort,
    } = req.body;

    if (!logText && !imageBase64) {
      return res.status(400).json({ error: 'Please provide either raw log text or an uploaded log image/screenshot.' });
    }

    // Build user prompt
    let promptText = `Please analyze the following Linux log data for security threats, unauthorized access, brute-force attempts, and firewall events.\n`;
    if (logCategory) {
      promptText += `User-specified category or context: ${logCategory}\n`;
    }
    if (whitelistIp) {
      promptText += `Administrator Whitelist IP (must not be blocked): ${whitelistIp}\n`;
    }
    if (sshPort) {
      promptText += `Active SSH Port: ${sshPort}\n`;
    }
    if (logText) {
      promptText += `\n=== LOG DATA BEGIN ===\n${logText.slice(0, 100000)}\n=== LOG DATA END ===\n`;
    } else {
      promptText += `\nPlease extract all visible log entries from the attached terminal/SIEM screenshot and analyze them in detail.\n`;
    }

    promptText += `Identify every malicious actor IP, analyze the pattern of attack, classify overall risk level, extract exact log lines as evidence, and generate ready-to-run ufw deny rules, fail2ban config, and sshd hardening commands. All bash commands must be formatted cleanly.`;

    // --- Provider Branch 0: Local Hugging Face (100% Free · On-Device Model) ---
    if (provider === 'local_hf') {
      const localResult = await localHfEngine.analyze(logText || '', whitelistIp, sshPort);
      return res.json({
        success: true,
        data: localResult,
        provider: 'local_hf',
        modelUsed: localHfEngine.modelName,
      });
    }

    // --- Provider Branch 1: Hugging Face API ---
    if (provider === 'huggingface') {
      const hfSystemPrompt = `${SYSTEM_INSTRUCTION}

You must respond with ONLY a single valid JSON object strictly matching this schema:
{
  "summary": "Concise executive summary of security findings",
  "overallRisk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "logTypeDetected": "string (e.g. auth.log, ufw.log, syslog)",
  "totalEventsAnalyzed": number,
  "attackVectors": ["string"],
  "threats": [
    {
      "id": "THREAT-001",
      "title": "string",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "attackVector": "string",
      "description": "string",
      "sourceIps": ["string"],
      "targetedPorts": ["string"],
      "targetedUsers": ["string"],
      "frequency": "string",
      "evidenceLogLines": ["string"],
      "recommendedAction": "string"
    }
  ],
  "suspiciousIps": [
    {
      "ip": "string",
      "attemptCount": number,
      "riskScore": number,
      "reputation": "string",
      "targetedService": "string",
      "firstSeen": "string",
      "lastSeen": "string",
      "suggestedAction": "DENY" | "LIMIT" | "MONITOR"
    }
  ],
  "remediation": {
    "ufwRules": [
      {
        "command": "sudo ufw insert 1 deny from <IP> to any comment 'LogGuard: ...'",
        "explanation": "string",
        "target": "string",
        "ruleNumber": 1
      }
    ],
    "fail2banConfig": {
      "jailLocalSnippet": "string",
      "explanation": "string",
      "commands": ["string"]
    },
    "sshdConfig": {
      "recommendedSettings": ["string"],
      "explanation": "string",
      "commands": ["string"]
    },
    "csfConfig": {
      "denyEntries": ["string"],
      "explanation": "string"
    },
    "bashScript": "string",
    "immediateActions": ["string"]
  }
}
Do NOT output any markdown backticks or conversational text. Output ONLY the JSON.`;

      const messages = [
        { role: 'system', content: hfSystemPrompt },
        { role: 'user', content: promptText },
      ];

      const rawOutput = await callHuggingFace({
        model: hfModel,
        token: hfToken,
        messages,
        responseFormatJson: true,
      });

      const parsedJson = extractJsonFromText(rawOutput);
      return res.json({
        success: true,
        data: parsedJson,
        provider: 'huggingface',
        modelUsed: hfModel || process.env.HF_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
      });
    }

    // --- Provider Branch 2: Google Gemini (Default) ---
    const contents: any[] = [];

    // Multimodal image support
    if (imageBase64) {
      const mime = imageMimeType || 'image/png';
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: mime,
          data: cleanBase64,
        },
      });
    }

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contents },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: auditResponseSchema,
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error('No analysis output received from model');
    }

    const parsedJson = JSON.parse(outputText);
    return res.json({
      success: true,
      data: parsedJson,
      provider: 'gemini',
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Error during log analysis:', err);
    let errMsg = err.message || 'Failed to complete log audit.';
    if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
      errMsg = 'The AI model is temporarily experiencing high demand. Please click "Run Security Audit" again to retry, or switch to the Hugging Face provider in Provider Settings.';
    }
    return res.status(500).json({
      error: errMsg,
      details: String(err),
    });
  }
});

// Interactive Audit Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      logContext = '',
      analysisSummary = '',
      provider = 'gemini',
      hfModel,
      hfToken,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const systemPrompt = `${SYSTEM_INSTRUCTION}

You are in a live interactive security consultation session with the Linux Systems Administrator.
You have access to the audited log records and findings:

Audit Context Summary:
${analysisSummary ? analysisSummary.slice(0, 4000) : 'No previous audit summary available.'}

Original Log Snippet Excerpt:
${logContext ? logContext.slice(0, 6000) : 'Logs not provided directly in this session.'}

Respond concisely and practically like a veteran senior SecOps engineer:
- When suggesting commands, ALWAYS provide all sequential terminal commands in ONE single contiguous code block (\`\`\`bash ... \`\`\`) rather than split across multiple separate code blocks, allowing the administrator to copy and execute them in one go.
- Highlight safety caveats (e.g., don't lock yourself out of SSH; how to whitelist your current IP).
- Keep formatting clean, scannable, and actionable.`;

    // --- Provider Branch 0: Local Hugging Face (100% Free · On-Device Model) ---
    if (provider === 'local_hf') {
      const reply = await localHfEngine.chat(message, history, logContext, analysisSummary);
      return res.json({
        success: true,
        reply,
        provider: 'local_hf',
        modelUsed: localHfEngine.modelName,
      });
    }

    // --- Provider Branch 1: Hugging Face API ---
    if (provider === 'huggingface') {
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      for (const h of history) {
        messages.push({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.content,
        });
      }

      messages.push({ role: 'user', content: message });

      const reply = await callHuggingFace({
        model: hfModel,
        token: hfToken,
        messages,
      });

      return res.json({
        success: true,
        reply,
        provider: 'huggingface',
        modelUsed: hfModel || process.env.HF_MODEL || 'meta-llama/Llama-3.3-70B-Instruct',
      });
    }

    // --- Provider Branch 2: Google Gemini (Default) ---
    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction: systemPrompt,
      },
    });

    for (const h of history) {
      if (h.role === 'user') {
        await chat.sendMessage({ message: h.content });
      }
    }

    const reply = await chat.sendMessage({
      message: message,
    });

    return res.json({
      success: true,
      reply: reply.text || 'No response generated.',
      provider: 'gemini',
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Error in audit chat:', err);
    let errMsg = err.message || 'Failed to process chat message.';
    if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
      errMsg = 'The AI model is temporarily experiencing high traffic. Please retry your question, or switch provider to Hugging Face.';
    }
    return res.status(500).json({
      error: errMsg,
    });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LogGuard] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[LogGuard] Fatal server start error:', err);
  process.exit(1);
});
