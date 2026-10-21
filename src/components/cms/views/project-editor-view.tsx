import * as React from "react"

import { Button } from "@src/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@src/components/ui/card"
import { Input } from "@src/components/ui/input"
import { Label } from "@src/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@src/components/ui/select"
import { Textarea } from "@src/components/ui/textarea"
import { CmsShell, type ActiveKey } from "@src/components/cms/shell"
import { submitForm } from "@src/components/cms/helpers"

export type ProjectEditData = {
  id: number
  title: string
  slug: string
  status: string
  description: string
  repoUrl: string
  demoUrl: string
  pubDate: string
  tags: string
  coverMediaId: string
  coverUrl: string | null
}

export type ProjectEditorViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  /** Initial sidebar state (from the sidebar_state cookie). */
  defaultOpen?: boolean
  isNew: boolean
  project: ProjectEditData | null
  mediaOptions: { id: string; filename: string }[]
  today: string
  notice: string
}

const COVER_NONE = "none"

export function ProjectEditorView(props: ProjectEditorViewProps) {
  const { project } = props
  const [status, setStatus] = React.useState(project?.status || "draft")
  const [cover, setCover] = React.useState(project?.coverMediaId || COVER_NONE)

  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="Projects"
    >
      <div>
        <a className="text-sm text-muted-foreground underline underline-offset-2" href="/cms/projects">
          All projects
        </a>
        <h1 className="text-xl font-semibold tracking-tight mt-0.5">
          {props.isNew ? "New project" : "Edit project"}
        </h1>
      </div>

      {props.notice ? (
        <Card className="border-emerald-200 bg-emerald-50 py-3">
          <CardContent className="text-sm text-emerald-800 px-4 py-0">{props.notice}</CardContent>
        </Card>
      ) : null}

      <form
        className="grid gap-6 lg:grid-cols-6"
        method="post"
        action="/cms/api/projects"
        encType="multipart/form-data"
        onSubmit={submitForm}
      >
        <input type="hidden" name="id" value={project ? String(project.id) : ""} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="cover_media_id" value={cover === COVER_NONE ? "" : cover} />

        {/* Left column */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Project details</CardTitle>
              <CardDescription>Shown on the projects page of your site.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={project?.title ?? ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={4} defaultValue={project?.description ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repo_url">Repository URL (GitHub)</Label>
                <Input
                  id="repo_url"
                  name="repo_url"
                  type="url"
                  defaultValue={project?.repoUrl ?? ""}
                  placeholder="https://github.com/username/repo"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="demo_url">Live demo URL</Label>
                <Input
                  id="demo_url"
                  name="demo_url"
                  type="url"
                  defaultValue={project?.demoUrl ?? ""}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">
                  Tags <span className="text-muted-foreground font-normal">(comma separated)</span>
                </Label>
                <Input id="tags" name="tags" defaultValue={project?.tags ?? ""} placeholder="python, aws" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Meta</CardTitle>
              <CardDescription>Visibility, slug and date.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">
                  Slug <span className="text-muted-foreground font-normal">(from title if blank)</span>
                </Label>
                <Input id="slug" name="slug" defaultValue={project?.slug ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pub_date">Publish date</Label>
                <Input
                  type="date"
                  id="pub_date"
                  name="pub_date"
                  defaultValue={project?.pubDate ?? props.today}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover image</CardTitle>
              <CardDescription>Shown on the projects cards.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cover_select">From your images</Label>
                <Select value={cover} onValueChange={setCover}>
                  <SelectTrigger id="cover_select" className="w-full">
                    <SelectValue placeholder="Choose an image" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={COVER_NONE}>No cover</SelectItem>
                    {props.mediaOptions.map((media) => (
                      <SelectItem key={media.id} value={media.id}>
                        #{media.id} {media.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cover_file">…or upload a new one</Label>
                <Input id="cover_file" name="cover_file" type="file" accept="image/*" />
              </div>
              {project?.coverUrl && (
                <img
                  className="rounded-md border w-full object-cover"
                  src={project.coverUrl}
                  alt="Current cover"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="p-4">
              <Button type="submit" className="w-full">
                Save project
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </CmsShell>
  )
}
export default ProjectEditorView;
