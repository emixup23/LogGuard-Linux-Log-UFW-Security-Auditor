# LogGuard 🛡️ — Linux Log & UFW Security Auditor

> **AI-Powered Linux Security Analysis & Hardening Rule Generator**  
> Inspect syslog, `auth.log`, and UFW events in real time. Detect brute-force intrusions, port sweeps, and privilege escalations, and generate immediate, single-block copy-pasteable remediation scripts.

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Transformers.js%20(Local)-yellow.svg)](https://huggingface.co/docs/transformers.js)
[![Gemini](https://img.shields.io/badge/Google-Gemini%202.5%20Flash-4285F4.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Key Highlights

- **🔒 100% Local On-Device AI Option**: Analyze sensitive production logs completely offline using `@huggingface/transformers` (`SmolLM2-135M-Instruct` in quantized 4-bit ONNX). Zero tokens, zero external egress, runs entirely on your local CPU.
- **⚡ Single-Block Bash Remediation**: Never juggle fragmented shell commands. LogGuard produces every firewall rule (`ufw`), intrusion prevention jail (`fail2ban`), and daemon tweak (`sshd_config`) consolidated into **one clean, contiguous bash script** with syntax highlighting and 1-click clipboard copy.
- **☁️ Multi-Engine Flexibility**:
  - **Local On-Device AI** (Hugging Face Transformers / `SmolLM2-135M`): Offline, zero API cost.
  - **Hugging Face Inference API** (Llama 3.3 70B, Qwen 2.5 Coder, Mistral): High-power open models via server-side router.
  - **Google Gemini 2.5 Flash**: Lightning-fast multimodal vision & deep reasoning for complex log forensics and terminal screenshots.
- **📋 Incident Presets**: One-click replay of real-world scenarios:
  - SSH Brute-Force attack (`auth.log` failed password storms)
  - UFW Port Scanning sweep (TCP SYN sweeps on sensitive ports)
  - Nginx Web Exploit & Path Traversal attempts (`.env` probes, SQLi patterns)
  - Sudo Privilege Escalation & failed `su` attempts
- **💬 Interactive SecOps Assistant**: Ask follow-up questions directly about suspicious IPs, WHOIS origins, CIDR ranges, and firewall best practices.
- **📸 Multimodal Log Ingestion**: Paste raw text, drag-and-drop `.log` or `.txt` files, or upload terminal screenshots and dashboard captures.

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────────────────┐
│                      LogGuard Client                      │
│        (React 19 + TypeScript + Tailwind CSS v4)          │
│                                                           │
│  ┌───────────────────────┐     ┌───────────────────────┐  │
│  │ Local On-Device AI    │     │ Cloud Engine Selector │  │
│  │ SmolLM2-135M (ONNX q4)│     │ HF API | Gemini Flash │  │
│  └───────────────────────┘     └───────────┬───────────┘  │
└────────────────────────────────────────────┼──────────────┘
                                             │ /api/* proxy
                                             ▼
┌───────────────────────────────────────────────────────────┐
│                   Express API Server                      │
│           (Node.js + TSX + Vite Middleware)               │
│                                                           │
│  • POST /api/analyze   — Multi-provider log analysis      │
│  • POST /api/chat      — SecOps assistant investigation   │
│  • POST /api/test-hf   — Hugging Face token verification  │
│  • GET  /api/health    — System status & available keys   │
└───────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `pnpm` / `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/logguard.git
   cd logguard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (Optional):**
   ```bash
   cp .env.example .env
   ```
   *Note: If you run LogGuard in Local On-Device AI mode, **no API keys are required**!*

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. Open your browser at `http://localhost:3000`.

---

## ⚙️ Configuration & AI Engines

LogGuard can operate in three distinct modes:

| Provider | Model | Setup Required | Best For | Privacy / Egress |
|---|---|---|---|---|
| **Local On-Device** *(Default)* | `SmolLM2-135M-Instruct` (q4 ONNX) | **None** (Downloads model on first run into local browser cache) | Air-gapped machines, sensitive HIPAA/PCI compliance logs, zero cost | 100% Local / Zero egress |
| **Hugging Face API** | `meta-llama/Llama-3.3-70B-Instruct` | `HUGGINGFACE_API_TOKEN` in `.env` or in UI modal | Enterprise-grade open source reasoning | Remote Hugging Face API |
| **Google Gemini** | `gemini-2.5-flash` | `GEMINI_API_KEY` in `.env` | Multimodal terminal screenshots, deep multi-vector incident analysis | Remote Google Cloud |

### `.env` File Reference

```env
# Optional: Required only if using Google Gemini
GEMINI_API_KEY="AIzaSy..."

# Optional: Required only if using remote Hugging Face Inference API
HUGGINGFACE_API_TOKEN="hf_..."

# Optional: Custom Hugging Face model repository
HF_MODEL="meta-llama/Llama-3.3-70B-Instruct"

# App Port (Defaults to 3000)
PORT=3000
```

---

## 💻 Usage Guide

### 1. Supply Logs
- **Paste Raw Logs**: Paste any snippet from `/var/log/auth.log`, `/var/log/ufw.log`, or `journalctl -u ssh`.
- **Upload Log File**: Drag and drop `.log` or `.txt` dumps.
- **Upload Screenshot**: Take a screenshot of your terminal window or monitoring dashboard.
- **Load Sample Incident**: Use the sample buttons (SSH Brute Force, UFW Port Scan, Web Exploit, Sudo Failure).

### 2. Choose AI Engine
- Select **Local (SmolLM2-135M)** for private, offline parsing.
- Select **Gemini 2.5 Flash** or **Hugging Face API** for advanced forensic depth.

### 3. Review Security Triage
- **Threat Level Indicator**: `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
- **Attack Classification**: Incident category and primary vector.
- **Offending Source IPs**: Extracted attacking addresses with affected ports and targets.
- **Impact Summary**: Concise explanation of what occurred and what systems are exposed.

### 4. Execute Remediation
LogGuard generates a **single, unified bash script**:

```bash
#!/usr/bin/env bash
# ==========================================================
# LogGuard Automated Hardening & Remediation Script
# Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# Threat Level: HIGH | Target: SSH Brute Force
# ==========================================================
set -euo pipefail

echo "==> [1/3] Blocking offending IP addresses via UFW..."
sudo ufw insert 1 deny from 198.51.100.45 to any comment "LogGuard: SSH brute force attacker"
sudo ufw insert 1 deny from 203.0.113.88 to any comment "LogGuard: SSH brute force attacker"

echo "==> [2/3] Hardening SSH daemon configuration..."
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 4/' /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl reload sshd || echo "WARNING: sshd check failed"

echo "==> [3/3] Reloading UFW firewall..."
sudo ufw reload

echo "==> Remediation complete. Firewall status:"
sudo ufw status numbered
```

Simply click **"Copy Remediation Script"** and run it with `sudo bash` or review it before applying.

---

## 🛠️ Supported Log Types

LogGuard is engineered to parse standard Linux system logs:

- **SSH & Auth**: `/var/log/auth.log`, `/var/log/secure`, PAM logs
- **Firewalls**: `/var/log/ufw.log`, `iptables.log`, `nftables`
- **Intrusion Prevention**: `/var/log/fail2ban.log`
- **Web Servers**: Nginx (`access.log`, `error.log`), Apache (`access_log`, `error_log`)
- **System Services**: `systemd` journals (`journalctl -xe`), `/var/log/syslog`, `/var/log/messages`
- **Container Daemons**: Docker engine and Kubernetes pod stdout logs

---

## 🔒 Security & Privacy Notice

- **Local Mode Guarantees**: When using **Local On-Device AI**, logs never leave your device. The inference engine runs inside WebAssembly / ONNX runtime in your browser.
- **Credential Storage**: User-provided Hugging Face tokens and API keys are stored only in memory or your private `.env` file; they are never broadcast or persisted to public repositories.
- **Script Review**: While LogGuard generates safe, idiomatic bash with `set -euo pipefail` safeguards, **always inspect generated scripts** before executing with `sudo` privileges on production servers.

---

## 🤝 Contributing

Contributions, bug reports, and rule improvements are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/NewRuleEngine`)
3. Commit your Changes (`git commit -m 'Add support for auditd logs'`)
4. Push to the Branch (`git push origin feature/NewRuleEngine`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
