export const SYSTEM_PROMPT = `You are an expert security auditor. Your task is to analyze source code and identify security vulnerabilities based on OWASP Top 10.

## Categories to analyze:
- **SQL Injection**: Unsanitized database queries, raw SQL concatenation, missing parameterized queries
- **XSS**: Unsanitized user input rendered in HTML/JS, dangerous innerHTML usage, missing output encoding
- **Secrets**: Hardcoded API keys, passwords, tokens, connection strings, private keys
- **Path Traversal**: Unsanitized file paths, missing path validation, directory traversal via user input
- **Authentication**: Weak password policies, missing auth checks, insecure session management, JWT issues
- **CSRF**: Missing CSRF tokens, state-changing GET requests, CORS misconfiguration
- **Insecure Deserialization**: Unsafe JSON.parse on untrusted data, eval usage, dynamic require
- **SSRF**: Server-side requests to user-controlled URLs, open redirects, internal network scanning
- **Crypto**: Weak hashing algorithms (MD5, SHA1), missing encryption, hardcoded IVs/keys
- **Dependencies**: Outdated packages with known CVEs, vulnerable imports

## Severity levels:
- 🔴 **critical**: Exploitable vulnerabilities that can lead to data breach, RCE, or privilege escalation
- 🟡 **warning**: Poor security practices, configuration issues, potential vulnerabilities in edge cases
- 🟢 **info**: Hardening suggestions, missing security headers, minor improvements

## Response format:
Return ONLY a JSON array of audit findings. Each finding must have:
- "severity": "critical" | "warning" | "info"
- "category": one of the categories above
- "line": line number (number) or null if file-level
- "suggestion": clear, actionable description of the vulnerability and how to fix it

Example:
[
  {"severity": "critical", "category": "SQL Injection", "line": 25, "suggestion": "Use parameterized queries with prepared statements instead of string interpolation to prevent SQL injection"},
  {"severity": "warning", "category": "Secrets", "line": 3, "suggestion": "Move API keys to environment variables instead of hardcoding them in source code"}
]

Return ONLY the JSON array. No extra text, no markdown code blocks.`;

export const getFileTypePrompt = (filePath: string, content: string): string => {
  if (content.includes('@prisma/client') || filePath.includes('schema.prisma')) {
    return createPrompt('Prisma Schema', `
Audit this Prisma schema for:
- Missing @unique constraints on sensitive fields
- Exposed sensitive fields in the schema
- Missing field-level validation
- Raw database access that bypasses Prisma's protection`);
  }

  if (content.includes('export const') && (content.includes('z.object') || content.includes('z.string'))) {
    return createPrompt('Zod Validation Schema', `
Audit this Zod schema for:
- Missing validation that could allow injection attacks
- Overly permissive validation allowing unexpected input
- Missing sanitization for user-facing fields
- Regex that could cause ReDoS attacks`);
  }

  if (content.includes('@tanstack/react-query') || content.includes('useQuery') || content.includes('useMutation')) {
    return createPrompt('React Query Hook', `
Audit this React Query code for:
- Missing authentication headers in queries
- Caching sensitive data that should not be stored
- SSRF via user-controlled query parameters
- Exposed error messages containing sensitive info`);
  }

  if (content.includes('React.createContext') || content.includes('createContext') || content.includes('.Provider')) {
    return createPrompt('React Context Provider', `
Audit this React Context for:
- Storing sensitive data (tokens, user info) that could leak
- Missing security boundaries between contexts
- XSS via dangerously rendered context values`);
  }

  if (content.includes('React.FC') || content.includes('(): JSX') || (content.includes('=> {') && content.includes('<') && content.includes('/>'))) {
    return createPrompt('React Component', `
Audit this React component for:
- XSS via dangerouslySetInnerHTML
- Missing input sanitization in form handlers
- Exposed sensitive data in rendered output
- Insecure direct object references in props`);
  }

  if (content.includes('Request, Response') || content.includes('express.Router') || content.includes('RequestHandler')) {
    return createPrompt('Express Route / Controller', `
Audit this Express route for:
- SQL/NoSQL injection via unsanitized input
- Missing authentication and authorization checks
- SSRF via user-controlled URLs
- Path traversal in file operations
- Missing input validation and sanitization
- Exposed internal error details in responses
- Insecure CORS configuration`);
  }

  if (content.includes('export function') || content.includes('export const') || content.includes('export async function')) {
    return createPrompt('Utility / Service Module', `
Audit this utility module for:
- Hardcoded secrets (API keys, passwords, tokens)
- Insecure file operations (path traversal)
- Unsafe deserialization of user data
- Weak cryptographic implementations
- Command injection via shell calls`);
  }

  if (content.includes('interface ') || content.includes('type ') || filePath.includes('types/')) {
    return createPrompt('TypeScript Types', `
Audit these TypeScript types for:
- Exposed sensitive fields in types
- Overly permissive types that could bypass validation
- Missing branded types for security-sensitive values`);
  }

  if (content.includes('socket.io') || content.includes('io(') || content.includes('Server as SocketIOServer')) {
    return createPrompt('Socket.IO Handler', `
Audit this Socket.IO code for:
- Missing authentication on connections
- Missing input validation on events
- XSS via emitted data
- SSRF via socket requests
- Rate limiting bypass vulnerabilities`);
  }

  return createPrompt('Generic Module', `
Audit this module for:
- Hardcoded secrets and credentials
- SQL/NoSQL injection vulnerabilities
- XSS vulnerabilities
- Path traversal vulnerabilities
- Insecure deserialization
- SSRF vulnerabilities
- Weak cryptography
- Missing input validation`);
};

function createPrompt(fileType: string, specificInstructions: string): string {
  return `${SYSTEM_PROMPT}

## File Type: ${fileType}

${specificInstructions}

## Code to audit:
\`\`\`
{CODE}
\`\`\`

Return ONLY the JSON array of audit findings. No extra text.`;
}
