import * as React from "react"

import { Button } from "@src/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@src/components/ui/card"
import { Input } from "@src/components/ui/input"
import { Label } from "@src/components/ui/label"
import { Separator } from "@src/components/ui/separator"
import { Textarea } from "@src/components/ui/textarea"
import { CmsShell, type ActiveKey } from "@src/components/cms/shell"
import { submitForm } from "@src/components/cms/helpers"

export type ProfileViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  /** Initial sidebar state (from the sidebar_state cookie). */
  defaultOpen?: boolean
  notice: string
  isErrorNotice: boolean
  profile: {
    name: string
    role: string
    bioMd: string
    githubUrl: string
    linkedinUrl: string
    siteTitle: string
    siteTagline: string
    siteDescription: string
  }
  avatarSrc: string
  bannerSrc: string
}

export function ProfileView(props: ProfileViewProps) {
  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="Profile & Site"
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile & Site</h1>
        <p className="text-sm text-muted-foreground">
          Identity, social links, SEO meta, and the site images.
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
        className="grid gap-6 lg:grid-cols-2"
        method="post"
        action="/cms/api/profile"
        encType="multipart/form-data"
        onSubmit={submitForm}
      >
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
              <CardDescription>Used across the site and in structured data.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={props.profile.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role / headline</Label>
                <Input
                  id="role"
                  name="role"
                  defaultValue={props.profile.role}
                  placeholder="Innovative AI Engineer"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio_md">
                  Author bio{" "}
                  <span className="text-muted-foreground font-normal">
                    (one paragraph per line — used in “About the author”, homepage intro and structured
                    data)
                  </span>
                </Label>
                <Textarea id="bio_md" name="bio_md" rows={5} defaultValue={props.profile.bioMd} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social profiles</CardTitle>
              <CardDescription>
                These links appear in the site header, author widget and SEO structured data.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  name="github_url"
                  type="url"
                  defaultValue={props.profile.githubUrl}
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  defaultValue={props.profile.linkedinUrl}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Site meta</CardTitle>
              <CardDescription>Header, tagline and SEO description.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="site_title">Site title</Label>
                <Input id="site_title" name="site_title" defaultValue={props.profile.siteTitle} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="site_tagline">Site tagline</Label>
                <Input id="site_tagline" name="site_tagline" defaultValue={props.profile.siteTagline} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="site_description">SEO description</Label>
                <Textarea
                  id="site_description"
                  name="site_description"
                  rows={2}
                  defaultValue={props.profile.siteDescription}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                Want to reuse an uploaded image instead? Use the Images page → “Set as avatar / banner”.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <img
                  className="h-16 w-16 rounded-full border object-cover"
                  src={props.avatarSrc}
                  alt="Current avatar"
                />
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="avatar_file">Profile picture</Label>
                  <Input id="avatar_file" name="avatar_file" type="file" accept="image/*" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <img
                  className="h-12 w-28 rounded-md border object-cover"
                  src={props.bannerSrc}
                  alt="Current banner"
                />
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="banner_file">Homepage banner</Label>
                  <Input id="banner_file" name="banner_file" type="file" accept="image/*" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <Button type="submit" className="w-full">
                Save profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </CmsShell>
  )
}
export default ProfileView;
