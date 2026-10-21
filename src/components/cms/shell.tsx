import * as React from "react"

import { AppSidebar } from "@src/components/cms/app-sidebar"
import { SiteHeader } from "@src/components/cms/site-header"
import { SidebarInset, SidebarProvider } from "@src/components/ui/sidebar"

export type ActiveKey =
  | "dashboard"
  | "posts"
  | "projects"
  | "profile"
  | "about"
  | "images"
  | "ai"
  | "account"

export type ShellProps = {
  user: string
  siteTitle: string
  avatarUrl?: string
  active: ActiveKey
  title: string
  /** Collapsed/expanded state persisted via the `sidebar_state` cookie (read on the server). */
  defaultOpen?: boolean
  children: React.ReactNode
}

/* Decides whether to render Member or SUPER Admin content */

export function CmsShell(props: ShellProps) {
  return (
    <SidebarProvider defaultOpen={props.defaultOpen}>
      <AppSidebar
        user={props.user}
        siteTitle={props.siteTitle}
        avatarUrl={props.avatarUrl}
        active={props.active}
      />
      <SidebarInset>
        <SiteHeader title={props.title} />
        <div className="flex flex-1 flex-col gap-2 p-4 md:gap-4 md:p-8">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
            {props.children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
