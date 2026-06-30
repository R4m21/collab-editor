import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(255).default("Untitled Document"),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const createVersionSchema = z.object({
  label: z.string().min(1).max(100),
});

export const aiRequestSchema = z.object({
  content: z.string().max(50000, "Content too large"),
  action: z.enum(["summarize", "grammar", "expand", "tone"]),
  tone: z.string().optional(),
});

// Sync payload: max 512KB binary Yjs update
export const MAX_SYNC_PAYLOAD = 512 * 1024;
