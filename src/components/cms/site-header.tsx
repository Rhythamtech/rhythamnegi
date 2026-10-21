import * as React from "react"

import { Separator } from "@src/components/ui/separator"
import { SidebarTrigger } from "@src/components/ui/sidebar"

export function SiteHeader({ title }: { title: string }) {
  return (
    /* Sidebar 07 ("An inset sidebar") header: sticky inside the inset area. */
    <header className="bg-sidebar sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
    </header>
  )
}
