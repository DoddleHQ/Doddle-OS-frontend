import { z } from 'zod';

export const HITLTypeSchema = z.enum([
    'content_review',
    'url_selection',
    'topic_input',
    'confirmation',
    'selection',
    'multi_selection',
    'feedback',
    'data_input',
    'per_page_feedback'
]);

export const HITLOptionSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.unknown()
});

export const PrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);

export const HITLInterruptPayloadSchema = z.object({
    version: z.number().default(1),
    type: z.literal('hitl_request'),
    hitl_type: HITLTypeSchema,
    message: z.string(),
    request_id: z.string().nullish(),
    options: z.array(HITLOptionSchema).nullish(),
    allow_free_input: z.boolean().optional(),
    default: z.unknown().optional(),
    data: z.record(z.unknown()).optional(),
    timeout_seconds: z.number().optional(),
    priority: PrioritySchema.optional()
});

export const ProgressEventSchema = z.object({
    type: z.literal('progress'),
    step: z.string(),
    step_number: z.number(),
    total_steps: z.number(),
    message: z.string(),
    progress: z.object({
        current: z.number(),
        total: z.number(),
        unit: z.string().optional()
    }).optional()
});

export const ArtifactEventSchema = z.object({
    type: z.literal('artifact'),
    artifact_id: z.string(),
    artifact_type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    content: z.unknown()
});

export const StepStartEventSchema = z.object({
    type: z.literal('step_start'),
    step: z.string(),
    step_number: z.number(),
    total_steps: z.number(),
    message: z.string()
});

export const StepCompleteEventSchema = z.object({
    type: z.literal('step_complete'),
    step: z.string(),
    step_number: z.number(),
    total_steps: z.number(),
    message: z.string()
});

export const ErrorEventSchema = z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
});

export const MessageEventSchema = z.object({
    type: z.literal('message'),
    content: z.string(),
    sender: z.string().optional()
});

export const CustomEventSchema = z.discriminatedUnion('type', [
    ProgressEventSchema,
    ArtifactEventSchema,
    StepStartEventSchema,
    StepCompleteEventSchema,
    ErrorEventSchema,
    MessageEventSchema
]);

export function validateHITLPayload(payload: unknown) {
    const result = HITLInterruptPayloadSchema.safeParse(payload);
    if (result.success) {
        return { success: true as const, data: result.data };
    }
    console.error('HITL payload validation failed:', result.error.errors);
    return { success: false as const, error: result.error };
}

export function validateCustomEvent(event: unknown) {
    const result = CustomEventSchema.safeParse(event);
    if (result.success) {
        return { success: true as const, data: result.data };
    }
    console.error('Custom event validation failed:', result.error.errors);
    return { success: false as const, error: result.error };
}

export function isValidHITLPayload(payload: unknown): payload is HITLInterruptPayloadValidated {
    return HITLInterruptPayloadSchema.safeParse(payload).success;
}

export function isValidCustomEvent(event: unknown): event is CustomEventValidated {
    return CustomEventSchema.safeParse(event).success;
}

export type HITLInterruptPayloadValidated = z.infer<typeof HITLInterruptPayloadSchema>;

export type HITLTypeValidated = z.infer<typeof HITLTypeSchema>;

export type HITLOptionValidated = z.infer<typeof HITLOptionSchema>;

export type PriorityValidated = z.infer<typeof PrioritySchema>;

export type ProgressEventValidated = z.infer<typeof ProgressEventSchema>;

export type ArtifactEventValidated = z.infer<typeof ArtifactEventSchema>;

export type MessageEventValidated = z.infer<typeof MessageEventSchema>;
export type ErrorEventValidated = z.infer<typeof ErrorEventSchema>;
export type CustomEventValidated = z.infer<typeof CustomEventSchema>;
