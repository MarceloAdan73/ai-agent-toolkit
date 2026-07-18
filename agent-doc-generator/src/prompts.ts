export const SYSTEM_PROMPT = `You are an expert code documentation assistant. Your task is to generate clear, comprehensive JSDoc documentation for the given source code. Follow the conventions used in the task-manager-pro project.

## Conventions to follow:
- Use JSDoc format with /** */ blocks.
- Include @param tags with types and descriptions.
- Include @returns tags with type and description.
- Include @example blocks when helpful.
- For React components, describe the component and all its props.
- For hooks, describe what state/behavior they manage.
- For utility functions, describe the transformation logic.
- For API routes/controllers, describe the endpoint, auth requirements, and response shape.
- For Zod validators, describe the validation rules.
- For TypeScript types/interfaces, describe each field.
- For Prisma schemas, describe models and relations.

## Response format:
Return ONLY the documented code wrapped in a markdown code block with the appropriate language tag. Preserve every line of the original code exactly as-is, prepending JSDoc comments above each export/function/component.`;

export const getFileTypePrompt = (filePath: string, content: string): string => {
  if (content.includes('@prisma/client') || filePath.includes('schema.prisma')) {
    return createPrompt('Prisma Schema', `
Document each model, field, relation, enum, and index with JSDoc-style comments above each declaration.
For each field include: type, purpose, and any constraints (unique, default, relation).
For enums: list each value and its meaning.
Group related models with section comments.`);
  }

  if (content.includes('export const') && (content.includes('z.object') || content.includes('z.string'))) {
    return createPrompt('Zod Validation Schema', `
Document each schema with its validation rules, field constraints (min, max, regex), and the inferred TypeScript type.
For each field describe: expected format, validation rules, and default values.`);
  }

  if (content.includes('@tanstack/react-query') || content.includes('useQuery') || content.includes('useMutation')) {
    return createPrompt('React Query Hook', `
Document the hook's purpose, what data it fetches/caches, mutation behavior, optimistic updates, error handling, and return value.
List all parameters with types.`);
  }

  if (content.includes('React.createContext') || content.includes('createContext') || content.includes('.Provider')) {
    return createPrompt('React Context Provider', `
Document the context purpose, the provider component and its props, the context value shape, and how to consume it via the custom hook.
Include usage example.`);
  }

  if (content.includes('React.FC') || content.includes('(): JSX') || (content.includes('=> {') && content.includes('<') && content.includes('/>'))) {
    return createPrompt('React Component', `
Document the component's purpose, all props (with types and descriptions), rendering logic, states (loading, empty, error, success), and side effects.
Include a usage example showing how to import and render the component with its props.`);
  }

  if (content.includes('Request, Response') || content.includes('express.Router') || content.includes('RequestHandler')) {
    return createPrompt('Express Route / Controller', `
For each route handler document: HTTP method, path, authentication requirements, request body/params/query schema, response shape on success and error, and which services it calls.
Include the response envelope format.`);
  }

  if (content.includes('export function') || content.includes('export const') || content.includes('export async function')) {
    return createPrompt('Utility / Service Module', `
Document each exported function: its purpose, parameters (with types), return value (with type), and any side effects or error conditions.
Include @example blocks showing typical usage.`);
  }

  if (content.includes('interface ') || content.includes('type ') || filePath.includes('types/')) {
    return createPrompt('TypeScript Type Definitions', `
Document each interface, type alias, and enum: their purpose, each field with its type and description.
Note which types are used as DTOs, API responses, or domain models.`);
  }

  if (content.includes('socket.io') || content.includes('io(') || content.includes('Server as SocketIOServer')) {
    return createPrompt('Socket.IO Handler', `
Document the socket events, authentication flow, room management, event payload shapes, and client connection lifecycle.`);
  }

  return createPrompt('Generic Module', `
Document each export: purpose, parameters, return value, and error handling.
Include @example for the main exports.`);
};

function createPrompt(fileType: string, specificInstructions: string): string {
  return `${SYSTEM_PROMPT}

## File Type: ${fileType}

${specificInstructions}

## Code to document:
\`\`\`
{CODE}
\`\`\`

Return ONLY the fully documented code in a single markdown code block. Do not include any extra text or explanations.`;
}
