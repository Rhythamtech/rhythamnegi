import * as React from "react"

import { Button } from "@src/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@src/components/ui/card"
import { CmsShell, type ActiveKey } from "@src/components/cms/shell"
import { StatusBadge, formatDate } from "@src/components/cms/helpers"

export type DashItem = {
  id: number
  title: string
  status: string
  date: string | null
}

export type DashboardViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  defaultOpen?: boolean
  stats: { label: string; value: number }[]
  recentPosts: DashItem[]
  recentProjects: DashItem[]
  siteUrl: string
}

export function DashboardView(props: DashboardViewProps) {
  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="Dashboard"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Every change here is stored in SQLite and goes live on{" "}
            <a
              className="underline underline-offset-2"
              href={props.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {props.siteTitle}
            </a>{" "}
            instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <a href="/cms/post-edit?id=new">New post</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="/cms/project-edit?id=new">New project</a>
          </Button>
        </div>
      </div>

      {/* Stat cards — dashboard-01 "reports row" style */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {props.stats.map((stat) => (
          <Card key={stat.label} className="gap-2 py-4">
            <CardHeader className="pb-0">
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums leading-none">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent posts</CardTitle>
            <CardDescription className="flex items-center justify-between gap-2">
              <span>Your latest writing.</span>
              <a className="underline underline-offset-2 font-normal" href="/cms/posts">
                Manage all
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {props.recentPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No posts yet — create your first one.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {props.recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center gap-3 py-2 text-sm">
                    <a
                      className="grow truncate font-medium hover:underline underline-offset-2"
                      href={`/cms/post-edit?id=${post.id}`}
                    >
                      {post.title}
                    </a>
                    <StatusBadge status={post.status} />
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatDate(post.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent projects</CardTitle>
            <CardDescription className="flex items-center justify-between gap-2">
              <span>Latest things you shipped.</span>
              <a className="underline underline-offset-2 font-normal" href="/cms/projects">
                Manage all
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {props.recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No projects yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {props.recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-3 py-2 text-sm">
                    <a
                      className="grow truncate font-medium hover:underline underline-offset-2"
                      href={`/cms/project-edit?id=${project.id}`}
                    >
                      {project.title}
                    </a>
                    <StatusBadge status={project.status} />
                    <span aria-hidden="true" className="shrink-0 opacity-0">
                      ·
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CmsShell>
  )
}
export default DashboardView;
