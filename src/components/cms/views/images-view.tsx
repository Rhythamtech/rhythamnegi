import * as React from "react"

import { Button } from "@src/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter
} from "@src/components/ui/card"
import { Input } from "@src/components/ui/input"
import { Label } from "@src/components/ui/label"
import { Badge } from "@src/components/ui/badge"
import { CmsShell, type ActiveKey } from "@src/components/cms/shell"
import { postAction, submitForm } from "@src/components/cms/helpers"

export type MediaCard = {
  id: string
  filename: string
  alt: string
  mime: string
  size: number | null
  isAvatar: boolean
  isBanner: boolean
}

export type ImagesViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  /** Initial sidebar state (from the sidebar_state cookie). */
  defaultOpen?: boolean
  media: MediaCard[]
  notice: string
  isErrorNotice: boolean
}

export function ImagesView(props: ImagesViewProps) {
  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="Images"
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Images</h1>
        <p className="text-sm text-muted-foreground">
          {props.media.length} images stored as blobs inside SQLite — no files on disk.
        </p>
      </div>

      {props.notice ? (
        <Card
          className={
            props.isErrorNotice
              ? "border-red-200 bg-red-50 py-3"
              : "border-emerald-200 bg-emerald-50 py-3"
          }
        >
          <CardContent
            className={
              props.isErrorNotice
                ? "text-sm text-red-700 px-4 py-0"
                : "text-sm text-emerald-800 px-4 py-0"
            }
          >
            {props.notice}
          </CardContent>
        </Card>
      ) : null}

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        method="post"
        action="/cms/api/images"
        encType="multipart/form-data"
        onSubmit={submitForm}
      >
        <div className="grid w-full gap-1.5 sm:w-64">
          <Label htmlFor="file">
            Upload image <span className="text-muted-foreground font-normal">(max 8 MB)</span>
          </Label>
          <Input id="file" name="file" type="file" accept="image/*" required />
        </div>
        <div className="grid w-full gap-1.5 sm:w-64">
          <Label htmlFor="alt">Alt text</Label>
          <Input id="alt" name="alt" placeholder="Description of the image" />
        </div>
        <Button type="submit">Upload</Button>
      </form>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {props.media.map((media) => (
          <Card
            key={media.id}
            className={
              media.isAvatar || media.isBanner
                ? "gap-3 py-3 ring-2 ring-emerald-300"
                : "gap-3 py-3"
            }
          >
            <CardContent className="flex flex-col gap-2 px-3 py-0">
              <a href={`/media/${media.id}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border bg-muted/40">
                <img
                  className="h-32 w-full object-contain"
                  src={`/media/${media.id}`}
                  alt={media.alt || media.filename}
                  loading="lazy"
                />
              </a>
              <div className="flex flex-wrap items-center gap-1">
                {media.isAvatar && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">Avatar</Badge>}
                {media.isBanner && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">Banner</Badge>}
              </div>
              <p className="truncate text-xs" title={media.alt || media.filename}>
                <span className="font-semibold">#{media.id}</span> {media.filename}
              </p>
              <p className="text-[10px] text-muted-foreground break-all">{media.mime} · /media/{media.id}</p>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-1.5 px-3 py-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => void postAction("/cms/api/images/set-profile", { id: media.id, kind: "avatar" })}
              >
                Set as avatar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => void postAction("/cms/api/images/set-profile", { id: media.id, kind: "banner" })}
              >
                Set as banner
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  if (!window.confirm("Delete this image? Pages referencing it will lose it.")) return
                  void postAction("/cms/api/images/delete", { id: media.id })
                }}
              >
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {props.media.length === 0 && (
        <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
      )}
    </CmsShell>
  )
}
export default ImagesView;
