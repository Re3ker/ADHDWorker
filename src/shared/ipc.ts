import { z } from "zod"

export const startWorkdayInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
})

export const taskInput = z.object({
  workSessionId: z.string().min(1),
  content: z.string().trim().min(1).max(500),
})

export const updateTaskInput = z.object({ taskId: z.string().min(1), content: z.string().trim().min(1).max(500) })
export const taskIdInput = z.string().min(1)
export const messageIdInput = z.object({ messageId: z.string().min(1) })

export type StartWorkdayInput = z.infer<typeof startWorkdayInput>
export type TaskInput = z.infer<typeof taskInput>
export type UpdateTaskInput = z.infer<typeof updateTaskInput>
