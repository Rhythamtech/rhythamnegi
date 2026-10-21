import * as React from "react"

import { MoreHorizontal, Plus, SquarePen, Trash2 } from "lucide-react"

import { Button } from "@src/components/ui/button"
import { Card, CardContent } from "@src/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@src/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@src/components/ui/table"
import { CmsShell, type ActiveKey } from "@src/components/cms/shell"
import { StatusBadge, formatDate, postAction } from "@src/components/cms/helpers"

export type ProjectListRow = {
  id: number
  title: string
  slug: string
  tags: string[]
  status: string
  date: string | null
  coverUrl: string | null
  repoUrl: string | null
  demoUrl: string | null
}

export type ProjectsViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  /** Initial sidebar state (from the sidebar_state cookie). */
  defaultOpen?: boolean
  projects: ProjectListRow[]
  notice: string
}

function deleteProject(event: React.MouseEvent<HTMLButtonElement>, id: number): void {
  event.preventDefault()
  if (!window.confirm("Delete this project permanently?")) return
  void postAction("/cms/api/projects/delete", { id: String(id) })
}

export function ProjectsView(props: ProjectsViewProps) {
  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="Projects"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {props.projects.length} projects stored in SQLite.
          </p>
        </div>
        <Button asChild size="sm">
          <a href="/cms/project-edit?id=new">
            <Plus />
            New project
          </a>
        </Button>
      </div>

      {props.notice ? (
        <Card className="border-emerald-200 bg-emerald-50 py-3">
          <CardContent className="text-sm text-emerald-800 px-4 py-0">{props.notice}</CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Project</TableHead>
                <TableHead className="hidden md:table-cell">Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="w-10 pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      {project.coverUrl ? (
                        <img
                          className="h-10 w-10 shrink-0 rounded-md border object-cover bg-muted"
                          src={project.coverUrl}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-md border border-dashed bg-muted/40" />
                      )}
                      <div className="min-w-0">
                        <a
                          className="font-medium hover:underline underline-offset-2"
                          href={`/cms/project-edit?id=${project.id}`}
                        >
                          {project.title}
                        </a>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.repoUrl || project.demoUrl || `/#${project.slug}`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {project.tags.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={project.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground tabular-nums">
                    {formatDate(project.date)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Row actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <a href={`/cms/project-edit?id=${project.id}`}>
                            <SquarePen />
                            Edit
                          </a>
                        </DropdownMenuItem>
                        {(project.repoUrl || project.demoUrl) && (
                          <DropdownMenuItem asChild>
                            <a
                              href={project.repoUrl || project.demoUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Visit repo / demo
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <button
                            type="button"
                            className="w-full cursor-pointer text-red-600 focus:text-red-600"
                            onClick={(e) => deleteProject(e, project.id)}
                          >
                            <Trash2 />
                            Delete
                          </button>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {props.projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No projects yet — create your first one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </CmsShell>
  )
}
export default ProjectsView;
