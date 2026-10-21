import * as React from "react"

import { ExternalLink, Sparkles, WandSparkles } from "lucide-react"

import { Badge } from "@src/components/ui/badge"
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
import { Separator } from "@src/components/ui/separator"
import { Textarea } from "@src/components/ui/textarea"
import { CmsShell, type ActiveKey } from "@src/components/cms/shell"
import { submitForm } from "@src/components/cms/helpers"

export type PostEditData = {
  id: number
  title: string
  slug: string
  status: string
  description: string
  seoTitle: string
  bodyMd: string
  pubDate: string
  updatedDate: string
  tags: string
  coverMediaId: string
  coverUrl: string | null
}

export type PostEditorViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  /** Initial sidebar state (from the sidebar_state cookie). */
  defaultOpen?: boolean
  isNew: boolean
  post: PostEditData | null
  mediaOptions: { id: string; filename: string }[]
  today: string
  notice: string
}

const COVER_NONE = "none"

type AiTask = "slug" | "description" | "seo_title" | "tags" | "draft" | "rewrite"

const AI_TASK_LABELS: Record<AiTask, string> = {
  slug: "Generate",
  description: "Generate",
  seo_title: "Generate",
  tags: "Suggest",
  draft: "AI draft",
  rewrite: "AI rewrite",
}

/** Which form state an AI task writes into when the user confirms it. */
const AI_TASK_TARGETS: Record<AiTask, "slug" | "description" | "seoTitle" | "tags" | "bodyMd"> = {
  slug: "slug",
  description: "description",
  seo_title: "seoTitle",
  tags: "tags",
  draft: "bodyMd",
  rewrite: "bodyMd",
}

type AiPreview = { task: AiTask; result: string; newTags?: string[] }

function AiAssistButton({
  task,
  busyTask,
  onRun,
  compact,
}: {
  task: AiTask
  busyTask: AiTask | null
  onRun: (task: AiTask) => void
  compact?: boolean
}) {
  const busyHere = busyTask === task
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={compact ? "h-7 px-2 text-xs text-purple-700 border-purple-200 hover:bg-purple-50" : ""}
      disabled={busyTask !== null}
      onClick={() => onRun(task)}
    >
      {busyHere ? (
        <WandSparkles className="animate-spin" />
      ) : (
        <Sparkles className="text-purple-600" />
      )}
      {busyHere ? "Thinking…" : AI_TASK_LABELS[task]}
    </Button>
  )
}

function AiPreviewPanel({
  result,
  monospace,
  tags,
  onApply,
  onDiscard,
}: {
  result: string
  monospace?: boolean
  /** Optional badge rendering (tags): existing system tags vs brand-new ones. */
  tags?: { label: string; isNew: boolean }[]
  onApply: () => void
  onDiscard: () => void
}) {
  return (
    <div className="rounded-md border border-purple-200 bg-purple-50 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-purple-800 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          AI suggestion — review before applying
        </span>
        <div className="flex gap-2">
          <Button type="button" size="sm" className="h-7 px-3 text-xs" onClick={onApply}>
            Use this
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
      {tags ? (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge
                key={t.label}
                variant="outline"
                className={
                  t.isNew
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-purple-300 bg-white text-purple-800"
                }
              >
                #{t.label}
                {t.isNew ? <span className="ml-1 text-[10px] font-semibold uppercase opacity-70">new</span> : null}
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Reused from your existing tags where possible —<span className="text-amber-600"> amber = new tag</span>.
          </p>
        </div>
      ) : monospace ? (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-800 bg-white/70 rounded p-2 border border-purple-100">
          {result}
        </pre>
      ) : (
        <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{result}</p>
      )}
    </div>
  )
}

export function PostEditorView(props: PostEditorViewProps) {
  const { post } = props
  const [status, setStatus] = React.useState(post?.status || "draft")
  const [cover, setCover] = React.useState(post?.coverMediaId || COVER_NONE)

  // Controlled fields that AI assist may write into.
  const [title, setTitle] = React.useState(post?.title ?? "")
  const [description, setDescription] = React.useState(post?.description ?? "")
  const [seoTitle, setSeoTitle] = React.useState(post?.seoTitle ?? "")
  const [slug, setSlug] = React.useState(post?.slug ?? "")
  const [tags, setTags] = React.useState(post?.tags ?? "")
  const [bodyMd, setBodyMd] = React.useState(post?.bodyMd ?? "")

  const [aiBusyTask, setAiBusyTask] = React.useState<AiTask | null>(null)
  const [aiPreview, setAiPreview] = React.useState<AiPreview | null>(null)
  const [aiError, setAiError] = React.useState("")

  async function runAiAssist(task: AiTask): Promise<void> {
    setAiError("")
    setAiPreview(null)
    setAiBusyTask(task)
    try {
      const res = await fetch("/cms/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, title, description, body: bodyMd })
      })
      const data: { ok?: boolean; result?: string; error?: string; newTags?: unknown } = await res
        .json()
        .catch(() => ({ error: "Unexpected server response." }))
      if (!res.ok || !data.ok || typeof data.result !== "string") {
        throw new Error(data.error || `AI request failed (${res.status}).`)
      }
      setAiPreview({
        task,
        result: data.result,
        newTags: Array.isArray(data.newTags)
          ? data.newTags.filter((t): t is string => typeof t === "string")
          : undefined
      })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI request failed — please try again.")
    } finally {
      setAiBusyTask(null)
    }
  }

  function applyAiPreview(): void {
    if (!aiPreview) return
    const setter: Record<string, (v: string) => void> = {
      slug: setSlug,
      description: setDescription,
      seoTitle: setSeoTitle,
      tags: setTags,
      bodyMd: setBodyMd
    }
    setter[AI_TASK_TARGETS[aiPreview.task]](aiPreview.result)
    setAiPreview(null)
  }

  const bodyPreviewTask = aiPreview ? (AI_TASK_TARGETS[aiPreview.task] === "bodyMd" ? aiPreview : null) : null

  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="Posts"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a className="text-sm text-muted-foreground underline underline-offset-2" href="/cms/posts">
            All posts
          </a>
          <h1 className="text-xl font-semibold tracking-tight mt-0.5">
            {props.isNew ? "New post" : "Edit post"}
          </h1>
          {post?.slug ? (
            <p className="text-xs text-muted-foreground mt-0.5">Public URL: /blog/{post.slug}/</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {post && !props.isNew && (
            <Button asChild size="sm" variant="outline">
              <a href={`/blog/${post.slug}/`} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                View live page
              </a>
            </Button>
          )}
        </div>
      </div>

      {props.notice ? (
        <Card className="border-emerald-200 bg-emerald-50 py-3">
          <CardContent className="text-sm text-emerald-800 px-4 py-0">{props.notice}</CardContent>
        </Card>
      ) : null}

      {aiError ? (
        <Card className="border-amber-200 bg-amber-50 py-3">
          <CardContent className="text-sm text-amber-800 px-4 py-0">{aiError}</CardContent>
        </Card>
      ) : null}

      <form
        className="grid gap-6 lg:grid-cols-6"
        method="post"
        action="/cms/api/posts"
        encType="multipart/form-data"
        onSubmit={submitForm}
      >
        <input type="hidden" name="id" value={post ? String(post.id) : ""} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="cover_media_id" value={cover === COVER_NONE ? "" : cover} />

        {/* Left column */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Post details</CardTitle>
              <CardDescription>Title, summary and the markdown body.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="description">
                    Description <span className="text-muted-foreground font-normal">(SEO summary)</span>
                  </Label>
                  <AiAssistButton task="description" busyTask={aiBusyTask} onRun={runAiAssist} compact />
                </div>
                <Textarea id="description" name="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                {aiPreview?.task === "description" && (
                  <AiPreviewPanel result={aiPreview.result} onApply={applyAiPreview} onDiscard={() => setAiPreview(null)} />
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="seo_title">Optional SEO title</Label>
                  <AiAssistButton task="seo_title" busyTask={aiBusyTask} onRun={runAiAssist} compact />
                </div>
                <Input
                  id="seo_title"
                  name="seo_title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Defaults to the post title"
                />
                {aiPreview?.task === "seo_title" && (
                  <AiPreviewPanel result={aiPreview.result} onApply={applyAiPreview} onDiscard={() => setAiPreview(null)} />
                )}
              </div>
              <Separator />
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="body_md">Content (Markdown)</Label>
                  <div className="flex gap-2">
                    <AiAssistButton task="draft" busyTask={aiBusyTask} onRun={runAiAssist} compact />
                    <AiAssistButton task="rewrite" busyTask={aiBusyTask} onRun={runAiAssist} compact />
                  </div>
                </div>
                <Textarea
                  id="body_md"
                  name="body_md"
                  rows={20}
                  className="font-mono leading-6"
                  value={bodyMd}
                  onChange={(e) => setBodyMd(e.target.value)}
                  placeholder={"Write the post in Markdown…\n\n## Heading\nParagraph text with **bold**, `code` and ```mermaid``` diagrams."}
                />
                <p className="text-xs text-muted-foreground">
                  GFM tables, Shiki code highlighting and <code>```mermaid</code> diagrams are supported — exactly like the old markdown files.
                </p>
                {bodyPreviewTask && (
                  <AiPreviewPanel result={bodyPreviewTask.result} monospace onApply={applyAiPreview} onDiscard={() => setAiPreview(null)} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Meta</CardTitle>
              <CardDescription>Visibility, slug and dates.</CardDescription>
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
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="slug">
                    Slug <span className="text-muted-foreground font-normal">(from title if blank)</span>
                  </Label>
                  <AiAssistButton task="slug" busyTask={aiBusyTask} onRun={runAiAssist} compact />
                </div>
                <Input id="slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
                {aiPreview?.task === "slug" && (
                  <AiPreviewPanel result={aiPreview.result} onApply={applyAiPreview} onDiscard={() => setAiPreview(null)} />
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pub_date">Publish date</Label>
                <Input
                  type="date"
                  id="pub_date"
                  name="pub_date"
                  defaultValue={post?.pubDate ?? props.today}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="updated_date">
                  Updated date <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input type="date" id="updated_date" name="updated_date" defaultValue={post?.updatedDate ?? ""} />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="tags">
                    Tags <span className="text-muted-foreground font-normal">(comma separated)</span>
                  </Label>
                  <AiAssistButton task="tags" busyTask={aiBusyTask} onRun={runAiAssist} compact />
                </div>
                <Input id="tags" name="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ai, langchain, python" />
                {aiPreview?.task === "tags" && (
                  <AiPreviewPanel
                    result={aiPreview.result}
                    tags={aiPreview.result
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => ({
                        label: t,
                        isNew: (aiPreview.newTags ?? []).some((n) => n.toLowerCase() === t.toLowerCase())
                      }))}
                    onApply={applyAiPreview}
                    onDiscard={() => setAiPreview(null)}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover image</CardTitle>
              <CardDescription>Shown on the blog list and cards.</CardDescription>
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
              {post?.coverUrl && (
                <img
                  className="rounded-md border w-full object-cover"
                  src={post.coverUrl}
                  alt="Current cover"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="p-4">
              <Button type="submit" className="w-full">
                Save post
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </CmsShell>
  )
}
export default PostEditorView;
