export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Threat {
  id: string;
  title: string;
  severity: ThreatSeverity;
  attackVector: string;
  description: string;
  sourceIps: string[];
  targetedPorts?: string[];
  targetedUsers?: string[];
  frequency?: string;
  evidenceLogLines: string[];
  recommendedAction: string;
}

export interface SuspiciousIP {
  ip: string;
  attemptCount: number;
  riskScore: number; // 1-100
  reputation?: string;
  targetedService?: string;
  firstSeen?: string;
  lastSeen?: string;
  suggestedAction: 'DENY' | 'LIMIT' | 'MONITOR' | string;
}

export interface UFWRule {
  command: string;
  explanation: string;
  target: string;
  ruleNumber?: number;
}

export interface Fail2banConfig {
  jailLocalSnippet: string;
  explanation: string;
  commands?: string[];
}

export interface SshdConfig {
  recommendedSettings: string[];
  explanation: string;
  commands?: string[];
}

export interface CsfConfig {
  denyEntries: string[];
  explanation: string;
}

export interface RemediationPlan {
  ufwRules: UFWRule[];
  fail2banConfig: Fail2banConfig;
  sshdConfig: SshdConfig;
  csfConfig?: CsfConfig;
  bashScript: string;
  immediateActions: string[];
}

export interface AuditResult {
  summary: string;
  overallRisk: ThreatSeverity;
  logTypeDetected: string;
  totalEventsAnalyzed: number;
  attackVectors: string[];
  threats: Threat[];
  suspiciousIps: SuspiciousIP[];
  remediation: RemediationPlan;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface SampleLogPreset {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  content: string;
}

export type AIProvider = 'local_hf' | 'gemini' | 'huggingface';

export interface ProviderConfig {
  provider: AIProvider;
  hfModel: string;
  hfToken?: string;
}

