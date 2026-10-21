import * as React from "react"

import { ExternalLink, MoreHorizontal, Plus, SquarePen, Trash2 } from "lucide-react"

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

export type PostListRow = {
  id: number
  title: string
  slug: string
  tags: string[]
  status: string
  date: string | null
  coverUrl: string | null
}

export type PostsViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  /** Initial sidebar state (from the sidebar_state cookie). */
  defaultOpen?: boolean
  posts: PostListRow[]
  notice: string
}

function deletePost(event: React.MouseEvent<HTMLButtonElement>, id: number): void {
  event.preventDefault()
  if (!window.confirm("Delete this post permanently?")) return
  void postAction("/cms/api/posts/delete", { id: String(id) })
}

export function PostsView(props: PostsViewProps) {
  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="Posts"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Posts</h1>
          <p className="text-sm text-muted-foreground">{props.posts.length} posts stored in SQLite.</p>
        </div>
        <Button asChild size="sm">
          <a href="/cms/post-edit?id=new">
            <Plus />
            New post
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
                <TableHead className="pl-4">Post</TableHead>
                <TableHead className="hidden md:table-cell">Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="w-10 pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      {post.coverUrl ? (
                        <img
                          className="h-10 w-10 shrink-0 rounded-md border object-cover bg-muted"
                          src={post.coverUrl}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-md border border-dashed bg-muted/40" />
                      )}
                      <div className="min-w-0">
                        <a
                          className="font-medium hover:underline underline-offset-2"
                          href={`/cms/post-edit?id=${post.id}`}
                        >
                          {post.title}
                        </a>
                        <p className="text-xs text-muted-foreground truncate">/blog/{post.slug}/</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {post.tags.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag) => (
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
                    <StatusBadge status={post.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground tabular-nums">
                    {formatDate(post.date)}
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
                          <a href={`/cms/post-edit?id=${post.id}`}>
                            <SquarePen />
                            Edit
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/blog/${post.slug}/`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink />
                            View live
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <button
                            type="button"
                            className="w-full cursor-pointer text-red-600 focus:text-red-600"
                            onClick={(e) => deletePost(e, post.id)}
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
              {props.posts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No posts yet — create your first one.
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
export default PostsView;
