"use server"

import { revalidatePath } from "next/cache"

import { deliverTelegramMessage, retryTelegramMessage } from "@/lib/telegram"
import {
  cancelPlannedWorkday,
  createPlannedOrImmediateWorkday,
  createTask,
  deleteTask,
  finishWorkday,
  pauseWorkday,
  resumeWorkday,
  updateSettings,
  updateTask,
} from "@/lib/workday-service"

export type ActionResponse = { ok: boolean; error?: string; messageId?: string }

function errorResponse(error: unknown): ActionResponse {
  return { ok: false, error: error instanceof Error ? error.message : "Aktion konnte nicht ausgeführt werden." }
}

export async function startWorkdayAction(formData: FormData): Promise<ActionResponse> {
  try {
    const result = await createPlannedOrImmediateWorkday({
      date: String(formData.get("date") || ""),
      time: String(formData.get("time") || ""),
    })
    await deliverTelegramMessage(result.message.id)
    revalidatePath("/")
    revalidatePath("/history")
    return { ok: true, messageId: result.message.id }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function cancelWorkdayAction(): Promise<ActionResponse> {
  try {
    await cancelPlannedWorkday()
    revalidatePath("/")
    return { ok: true }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function pauseWorkdayAction(): Promise<ActionResponse> {
  try {
    const result = await pauseWorkday()
    await deliverTelegramMessage(result.messageId)
    revalidatePath("/")
    return { ok: true, messageId: result.messageId }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function resumeWorkdayAction(): Promise<ActionResponse> {
  try {
    const result = await resumeWorkday()
    await deliverTelegramMessage(result.messageId)
    revalidatePath("/")
    return { ok: true, messageId: result.messageId }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function finishWorkdayAction(): Promise<ActionResponse> {
  try {
    const result = await finishWorkday()
    await deliverTelegramMessage(result.messageId)
    revalidatePath("/")
    revalidatePath("/history")
    return { ok: true, messageId: result.messageId }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function createTaskAction(formData: FormData): Promise<ActionResponse> {
  try {
    await createTask({ workSessionId: String(formData.get("workSessionId") || ""), content: String(formData.get("content") || "") })
    revalidatePath("/")
    return { ok: true }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function updateTaskAction(formData: FormData): Promise<ActionResponse> {
  try {
    await updateTask({ taskId: String(formData.get("taskId") || ""), content: String(formData.get("content") || "") })
    revalidatePath("/")
    revalidatePath("/history")
    return { ok: true }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function deleteTaskAction(formData: FormData): Promise<ActionResponse> {
  try {
    await deleteTask(String(formData.get("taskId") || ""))
    revalidatePath("/")
    revalidatePath("/history")
    return { ok: true }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function saveSettingsAction(formData: FormData): Promise<ActionResponse> {
  try {
    await updateSettings({
      defaultStartTime: String(formData.get("defaultStartTime") || ""),
      telegramChatId: String(formData.get("telegramChatId") || ""),
      telegramBotToken: String(formData.get("telegramBotToken") || ""),
      timezone: String(formData.get("timezone") || ""),
      startMessageTemplate: String(formData.get("startMessageTemplate") || ""),
      pauseMessageTemplate: String(formData.get("pauseMessageTemplate") || ""),
      resumeMessageTemplate: String(formData.get("resumeMessageTemplate") || ""),
      endMessageTemplate: String(formData.get("endMessageTemplate") || ""),
    })
    revalidatePath("/")
    revalidatePath("/settings")
    return { ok: true }
  } catch (error) {
    return errorResponse(error)
  }
}

export async function retryTelegramAction(formData: FormData): Promise<ActionResponse> {
  try {
    const id = String(formData.get("messageId") || "")
    await retryTelegramMessage(id)
    revalidatePath("/")
    revalidatePath("/history")
    return { ok: true, messageId: id }
  } catch (error) {
    return errorResponse(error)
  }
}
