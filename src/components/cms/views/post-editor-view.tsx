import * as React from "react"

import { ExternalLink } from "lucide-react"

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

export function PostEditorView(props: PostEditorViewProps) {
  const { post } = props
  const [status, setStatus] = React.useState(post?.status || "draft")
  const [cover, setCover] = React.useState(post?.coverMediaId || COVER_NONE)

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
                <Input id="title" name="title" defaultValue={post?.title ?? ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">
                  Description <span className="text-muted-foreground font-normal">(SEO summary)</span>
                </Label>
                <Textarea id="description" name="description" rows={2} defaultValue={post?.description ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="seo_title">Optional SEO title</Label>
                <Input
                  id="seo_title"
                  name="seo_title"
                  defaultValue={post?.seoTitle ?? ""}
                  placeholder="Defaults to the post title"
                />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="body_md">Content (Markdown)</Label>
                <Textarea
                  id="body_md"
                  name="body_md"
                  rows={20}
                  className="font-mono leading-6"
                  defaultValue={post?.bodyMd ?? ""}
                  placeholder={"Write the post in Markdown…\n\n## Heading\nParagraph text with **bold**, `code` and ```mermaid``` diagrams."}
                />
                <p className="text-xs text-muted-foreground">
                  GFM tables, Shiki code highlighting and <code>```mermaid</code> diagrams are supported — exactly like the old markdown files.
                </p>
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
                <Label htmlFor="slug">
                  Slug <span className="text-muted-foreground font-normal">(from title if blank)</span>
                </Label>
                <Input id="slug" name="slug" defaultValue={post?.slug ?? ""} />
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
                <Label htmlFor="tags">
                  Tags <span className="text-muted-foreground font-normal">(comma separated)</span>
                </Label>
                <Input id="tags" name="tags" defaultValue={post?.tags ?? ""} placeholder="ai, langchain, python" />
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
