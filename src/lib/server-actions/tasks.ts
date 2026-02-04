"use server";

import { prisma } from "@/lib/db";
import { requireOrgAdmin } from "@/lib/authz";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { TaskPriority, TaskRecurrence } from "@prisma/client";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}

function parsePriority(raw: unknown): TaskPriority {
  const v = String(raw || "").toUpperCase();
  if (v === "LOW" || v === "MEDIUM" || v === "HIGH") return v as TaskPriority;
  return "MEDIUM";
}

function parseRecurrence(raw: unknown): TaskRecurrence {
  const v = String(raw || "").toUpperCase();
  if (v === "NONE" || v === "WEEKLY" || v === "BIWEEKLY" || v === "MONTHLY") return v as TaskRecurrence;
  return "NONE";
}

function parseDueAt(raw: unknown): Date | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  // HTML datetime-local input -> "YYYY-MM-DDTHH:mm"
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function nextDueAtFromRecurrence(dueAt: Date, recurrence: TaskRecurrence): Date | null {
  const next = new Date(dueAt);
  if (recurrence === "WEEKLY") next.setDate(next.getDate() + 7);
  else if (recurrence === "BIWEEKLY") next.setDate(next.getDate() + 14);
  else if (recurrence === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else return null;
  return next;
}

/**
 * Create a task (optionally linked to a lead)
 * FormData:
 * - title
 * - body (optional)
 * - dueAt (datetime-local string)
 * - priority (LOW|MEDIUM|HIGH)
 * - recurrence (NONE|WEEKLY|BIWEEKLY|MONTHLY)
 * - leadId (optional)
 */
export async function createTaskAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const title = String(formData.get("title") || "").trim();
    const body = String(formData.get("body") || "").trim();
    const dueAt = parseDueAt(formData.get("dueAt"));
    const priority = parsePriority(formData.get("priority"));
    const recurrence = parseRecurrence(formData.get("recurrence"));
    const leadIdRaw = String(formData.get("leadId") || "").trim();
    const leadId = leadIdRaw ? leadIdRaw : null;

    if (!title) return { ok: false, error: "Task title is required." };
    if (!dueAt) return { ok: false, error: "Due date/time is required." };

    const a = await auth();
    const createdByUserId = a.userId ?? null;

    await prisma.task.create({
      data: {
        title,
        body: body ? body : null,
        dueAt,
        priority,
        recurrence,
        leadId,
        createdByUserId,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/leads");

    return { ok: true, message: "Task created." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Toggle completion. When completing a recurring task,
 * automatically create the next occurrence.
 *
 * FormData:
 * - taskId
 * - complete ("true" to mark complete, otherwise re-open)
 */
export async function toggleTaskCompleteAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();

    const taskId = String(formData.get("taskId") || "").trim();
    const complete = String(formData.get("complete") || "true") === "true";

    if (!taskId) return { ok: false, error: "Missing taskId." };

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { ok: false, error: "Task not found." };

    if (complete) {
      // Mark complete
      const completedAt = new Date();

      await prisma.task.update({
        where: { id: taskId },
        data: { completedAt },
      });

      // If recurring, create next
      if (task.recurrence !== "NONE") {
        const nextDue = nextDueAtFromRecurrence(task.dueAt, task.recurrence);
        if (nextDue) {
          await prisma.task.create({
            data: {
              title: task.title,
              body: task.body,
              dueAt: nextDue,
              priority: task.priority,
              recurrence: task.recurrence,
              leadId: task.leadId,
              createdByUserId: task.createdByUserId,
            },
          });
        }
      }

      revalidatePath("/admin");
      revalidatePath("/admin/tasks");
      revalidatePath("/admin/leads");

      return task.recurrence !== "NONE"
        ? { ok: true, message: "Completed. Next occurrence scheduled." }
        : { ok: true, message: "Task completed." };
    } else {
      // Re-open
      await prisma.task.update({
        where: { id: taskId },
        data: { completedAt: null },
      });

      revalidatePath("/admin");
      revalidatePath("/admin/tasks");
      revalidatePath("/admin/leads");

      return { ok: true, message: "Task re-opened." };
    }
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteTaskAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireOrgAdmin();
    const taskId = String(formData.get("taskId") || "").trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };

    await prisma.task.delete({ where: { id: taskId } });

    revalidatePath("/admin");
    revalidatePath("/admin/tasks");
    revalidatePath("/admin/leads");

    return { ok: true, message: "Task deleted." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
