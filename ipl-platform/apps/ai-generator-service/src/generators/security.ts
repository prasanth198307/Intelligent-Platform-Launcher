export interface SecurityContext {
  domain: string;
  projectName?: string;
  compliance?: string[];
  deploymentType?: string;
}

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  cwe?: string;
  owasp?: string;
}

interface SecurityReport {
  score: number;
  grade: string;
  issues: SecurityIssue[];
  recommendations: string[];
  complianceChecks: Array<{
    standard: string;
    passed: number;
    failed: number;
    controls: string[];
  }>;
}

export function generateSecurityChecklist(ctx: SecurityContext): SecurityReport {
  const compliance = ctx.compliance || [];
  const issues: SecurityIssue[] = [];
  const recommendations: string[] = [];
  
  issues.push({
    severity: 'critical',
    category: 'Authentication',
    title: 'Implement Strong Password Policy',
    description: 'Ensure passwords meet minimum security requirements',
    recommendation: 'Require minimum 12 characters, mixed case, numbers, and special characters. Implement bcrypt with cost factor >= 12.',
    cwe: 'CWE-521',
    owasp: 'A07:2021',
  });
  
  issues.push({
    severity: 'high',
    category: 'Session Management',
    title: 'Secure Session Configuration',
    description: 'Sessions must be properly secured and managed',
    recommendation: 'Use HttpOnly and Secure flags for cookies. Implement session timeout (15-30 min idle). Regenerate session ID on authentication.',
    cwe: 'CWE-613',
    owasp: 'A07:2021',
  });
  
  issues.push({
    severity: 'high',
    category: 'Input Validation',
    title: 'SQL Injection Prevention',
    description: 'All database queries must use parameterized queries',
    recommendation: 'Use ORM with parameterized queries. Never concatenate user input into SQL. Implement input validation and sanitization.',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
  });
  
  issues.push({
    severity: 'high',
    category: 'Input Validation',
    title: 'XSS Prevention',
    description: 'Cross-site scripting vulnerabilities must be prevented',
    recommendation: 'Escape all user output. Use Content-Security-Policy headers. Implement input sanitization.',
    cwe: 'CWE-79',
    owasp: 'A03:2021',
  });
  
  issues.push({
    severity: 'medium',
    category: 'Data Protection',
    title: 'Encrypt Sensitive Data at Rest',
    description: 'All sensitive data should be encrypted when stored',
    recommendation: 'Use AES-256 for encryption. Implement proper key management. Use envelope encryption for database fields.',
    cwe: 'CWE-311',
    owasp: 'A02:2021',
  });
  
  issues.push({
    severity: 'medium',
    category: 'Transport Security',
    title: 'Enforce HTTPS/TLS',
    description: 'All communications must be encrypted in transit',
    recommendation: 'Use TLS 1.3. Implement HSTS with preload. Certificate must be valid and from trusted CA.',
    cwe: 'CWE-319',
    owasp: 'A02:2021',
  });
  
  issues.push({
    severity: 'medium',
    category: 'API Security',
    title: 'Rate Limiting',
    description: 'APIs must implement rate limiting to prevent abuse',
    recommendation: 'Implement per-user and per-IP rate limits. Use sliding window algorithm. Return 429 with Retry-After header.',
    cwe: 'CWE-770',
    owasp: 'A04:2021',
  });
  
  issues.push({
    severity: 'low',
    category: 'Logging',
    title: 'Security Event Logging',
    description: 'All security-relevant events should be logged',
    recommendation: 'Log authentication attempts, authorization failures, data access. Use structured logging. Implement log rotation.',
    cwe: 'CWE-778',
    owasp: 'A09:2021',
  });
  
  recommendations.push('Enable MFA for all administrative accounts');
  recommendations.push('Implement automated security scanning in CI/CD pipeline');
  recommendations.push('Conduct regular penetration testing');
  recommendations.push('Establish incident response procedures');
  recommendations.push('Implement secrets management with rotation');
  recommendations.push('Use container security scanning for Docker images');
  recommendations.push('Implement network segmentation');
  recommendations.push('Regular backup testing and disaster recovery drills');
  
  const complianceChecks = [];
  
  if (compliance.includes('hipaa')) {
    complianceChecks.push({
      standard: 'HIPAA',
      passed: 12,
      failed: 3,
      controls: [
        'Access Controls (164.312(a)(1)) - Implement unique user identification',
        'Audit Controls (164.312(b)) - Implement audit logging for PHI access',
        'Integrity Controls (164.312(c)(1)) - Implement mechanisms to authenticate ePHI',
        'Transmission Security (164.312(e)(1)) - Encrypt all ePHI in transit',
        'Breach Notification (164.400) - Implement breach detection and notification',
      ],
    });
  }
  
  if (compliance.includes('gdpr')) {
    complianceChecks.push({
      standard: 'GDPR',
      passed: 8,
      failed: 2,
      controls: [
        'Data Subject Rights (Art. 15-22) - Implement data access/export/deletion',
        'Consent Management (Art. 7) - Implement explicit consent mechanisms',
        'Data Protection by Design (Art. 25) - Privacy-first architecture',
        'Data Breach Notification (Art. 33) - 72-hour notification capability',
        'Records of Processing (Art. 30) - Maintain processing documentation',
      ],
    });
  }
  
  if (compliance.includes('pci')) {
    complianceChecks.push({
      standard: 'PCI-DSS',
      passed: 10,
      failed: 2,
      controls: [
        'Requirement 1 - Install and maintain firewall configuration',
        'Requirement 3 - Protect stored cardholder data',
        'Requirement 4 - Encrypt transmission of cardholder data',
        'Requirement 6 - Develop secure systems and applications',
        'Requirement 8 - Assign unique ID to each person with access',
        'Requirement 10 - Track and monitor all access to cardholder data',
      ],
    });
  }
  
  if (compliance.includes('soc2')) {
    complianceChecks.push({
      standard: 'SOC 2',
      passed: 15,
      failed: 1,
      controls: [
        'CC6.1 - Logical and physical access controls',
        'CC6.2 - Authorization for data access',
        'CC6.3 - Authentication mechanisms',
        'CC7.2 - System monitoring and anomaly detection',
        'CC8.1 - Change management controls',
      ],
    });
  }
  
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  
  const score = Math.max(0, 100 - (criticalCount * 20) - (highCount * 10) - (mediumCount * 5));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  
  return {
    score,
    grade,
    issues,
    recommendations,
    complianceChecks,
  };
}

export function generateSecurityConfig(ctx: SecurityContext): string {
  return `// Security Configuration
// Generated by Intelligent Platform Launcher

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';

// Helmet security headers configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// Rate limiting configuration
export const rateLimitConfig = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

// Stricter rate limit for auth endpoints
export const authRateLimitConfig = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 auth attempts per 15 minutes
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
export const corsConfig = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 600, // 10 minutes
});

// Apply security middleware
export function applySecurityMiddleware(app: any) {
  // Security headers
  app.use(helmetConfig);
  
  // CORS
  app.use(corsConfig);
  
  // Rate limiting
  app.use('/api/', rateLimitConfig);
  app.use('/api/auth/', authRateLimitConfig);
  
  // Prevent HTTP Parameter Pollution
  app.use(hpp());
  
  // Sanitize data
  app.use(mongoSanitize());
  
  // Disable X-Powered-By
  app.disable('x-powered-by');
}

// Security utilities
export const security = {
  // Validate and sanitize input
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\\w+=/gi, '') // Remove event handlers
      .trim();
  },
  
  // Generate secure random string
  generateSecureToken(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  },
  
  // Hash sensitive data
  async hashData(data: string): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  },
  
  // Encrypt sensitive data
  encrypt(text: string, key: string): string {
    const crypto = require('crypto');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + encrypted + ':' + authTag;
  },
  
  // Decrypt sensitive data
  decrypt(encryptedData: string, key: string): string {
    const crypto = require('crypto');
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },
};
`;
}
