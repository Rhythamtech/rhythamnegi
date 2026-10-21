import * as React from "react"

import { Badge } from "@src/components/ui/badge"

/**
 * Posts any <form> (including multipart file uploads) to the server-side CMS
 * endpoints. They respond with 303 redirects, which fetch follows; navigating
 * to the final URL keeps the exact same https-loader-free flow as before.
 */
export async function submitForm(event: React.FormEvent<HTMLFormElement>): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget
  const button = form.querySelector<HTMLButtonElement>("button[type='submit']")
  if (button) button.disabled = true
  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      redirect: "follow"
    })
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
    window.location.assign(res.url)
  } catch {
    alert("Something went wrong while saving — please try again.")
    if (button) button.disabled = false
  }
}

/** Fire-and-forget POST (add/delete style endpoints). */
export async function postAction(action: string, body: Record<string, string>): Promise<void> {
  const data = new FormData()
  for (const [key, value] of Object.entries(body)) data.set(key, value)
  try {
    const res = await fetch(action, { method: "POST", body: data, redirect: "follow" })
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
    window.location.assign(res.url)
  } catch {
    alert("Something went wrong — please try again.")
  }
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "published"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }
    >
      {status}
    </Badge>
  )
}

const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })

export function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return dateFmt.format(d)
}
