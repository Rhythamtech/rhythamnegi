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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@src/components/ui/select"
import { Textarea } from "@src/components/ui/textarea"
import { CmsShell, type ActiveKey } from "@src/components/cms/shell"
import { postAction, submitForm } from "@src/components/cms/helpers"

export type ExperienceItem = { id: number; company: string; role: string; period: string; bullets: string; ord: number }
export type SkillItem = { id: number; heading: string; items: string; ord: number }
export type EducationItem = { id: number; title: string; ord: number }

export type AboutViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  defaultOpen?: boolean
  notice: string
  isErrorNotice: boolean
  heroIntro: string
  aboutIntro: string
  experience: ExperienceItem[]
  skills: SkillItem[]
  education: EducationItem[]
}

export function AboutView(props: AboutViewProps) {
  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="About Page"
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight">About & Intros</h1>
        <p className="text-sm text-muted-foreground">
          Intro texts plus the structured experience, skills and education sections.
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

      {/* -------- Intro texts -------- */}
      <form method="post" action="/cms/api/about/intros" onSubmit={submitForm}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Homepage intro</CardTitle>
              <CardDescription>Hero text under the role headline (Markdown).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <Textarea
                id="hero_intro"
                name="hero_intro"
                rows={6}
                className="font-mono leading-6"
                defaultValue={props.heroIntro}
              />
              <Button type="submit" size="sm" className="self-start">
                Save intro
              </Button>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>About-page intro</CardTitle>
              <CardDescription>Intro paragraph (Markdown).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <Textarea
                id="about_intro"
                name="about_intro"
                rows={6}
                className="font-mono leading-6"
                defaultValue={props.aboutIntro}
              />
              <Button type="submit" size="sm" className="self-start">
                Save intro
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* -------- Experience -------- */}
      <form method="post" action="/cms/api/about/experience" onSubmit={submitForm}>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Experience ({props.experience.length})</CardTitle>
              <CardDescription>One bullet per line in Highlights.</CardDescription>
            </div>
            <Button type="submit" size="sm">
              Save experience
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {props.experience.map((exp) => (
              <div key={exp.id} className="rounded-lg border p-4 grid gap-3 md:grid-cols-6 items-start">
                <input type="hidden" name="id[]" value={String(exp.id)} />
                <div className="grid gap-1.5 md:col-span-2">
                  <Label htmlFor={`company-${exp.id}`}>Company</Label>
                  <Input id={`company-${exp.id}`} name={`company-${exp.id}`} defaultValue={exp.company} />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <Label htmlFor={`role-${exp.id}`}>Role</Label>
                  <Input id={`role-${exp.id}`} name={`role-${exp.id}`} defaultValue={exp.role} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`period-${exp.id}`}>Period</Label>
                  <Input id={`period-${exp.id}`} name={`period-${exp.id}`} defaultValue={exp.period} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`ord-${exp.id}`}>Order</Label>
                  <Input id={`ord-${exp.id}`} name={`ord-${exp.id}`} type="number" defaultValue={String(exp.ord)} />
                </div>
                <div className="grid gap-1.5 md:col-span-6">
                  <Label htmlFor={`bullets-${exp.id}`}>Highlights</Label>
                  <Textarea
                    id={`bullets-${exp.id}`}
                    name={`bullets-${exp.id}`}
                    rows={3}
                    className="font-mono leading-6"
                    defaultValue={exp.bullets}
                  />
                </div>
              </div>
            ))}
            {props.experience.length === 0 && (
              <p className="text-sm text-muted-foreground">No entries yet — add one below.</p>
            )}
          </CardContent>
        </Card>
      </form>

      {/* -------- Skills -------- */}
      <form method="post" action="/cms/api/about/skills" onSubmit={submitForm}>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Skills ({props.skills.length})</CardTitle>
              <CardDescription>Comma separated items per category.</CardDescription>
            </div>
            <Button type="submit" size="sm">
              Save skills
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {props.skills.map((skill) => (
              <div key={skill.id} className="rounded-lg border p-4 grid gap-3 md:grid-cols-5 items-end">
                <input type="hidden" name="id[]" value={String(skill.id)} />
                <div className="grid gap-1.5 md:col-span-2">
                  <Label htmlFor={`heading-${skill.id}`}>Category</Label>
                  <Input id={`heading-${skill.id}`} name={`heading-${skill.id}`} defaultValue={skill.heading} />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <Label htmlFor={`items-${skill.id}`}>Items</Label>
                  <Input id={`items-${skill.id}`} name={`items-${skill.id}`} defaultValue={skill.items} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`skill-ord-${skill.id}`}>Order</Label>
                  <Input
                    id={`skill-ord-${skill.id}`}
                    name={`ord-${skill.id}`}
                    type="number"
                    defaultValue={String(skill.ord)}
                  />
                </div>
              </div>
            ))}
            {props.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No entries yet — add one below.</p>
            )}
          </CardContent>
        </Card>
      </form>

      {/* -------- Education -------- */}
      <form method="post" action="/cms/api/about/education" onSubmit={submitForm}>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Education & certifications ({props.education.length})</CardTitle>
              <CardDescription>Degrees, courses and certificates.</CardDescription>
            </div>
            <Button type="submit" size="sm">
              Save education
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {props.education.map((item) => (
              <div key={item.id} className="rounded-lg border p-4 grid gap-3 md:grid-cols-6 items-end">
                <input type="hidden" name="id[]" value={String(item.id)} />
                <div className="grid gap-1.5 md:col-span-5">
                  <Label htmlFor={`title-${item.id}`}>Title</Label>
                  <Input id={`title-${item.id}`} name={`title-${item.id}`} defaultValue={item.title} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`edu-ord-${item.id}`}>Order</Label>
                  <Input
                    id={`edu-ord-${item.id}`}
                    name={`ord-${item.id}`}
                    type="number"
                    defaultValue={String(item.ord)}
                  />
                </div>
              </div>
            ))}
            {props.education.length === 0 && (
              <p className="text-sm text-muted-foreground">No entries yet — add one below.</p>
            )}
          </CardContent>
        </Card>
      </form>

      {/* -------- Add + remove -------- */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void postAction("/cms/api/about/experience/add", {})}
        >
          + Add experience
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void postAction("/cms/api/about/skills/add", {})}
        >
          + Add skill category
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void postAction("/cms/api/about/education/add", {})}
        >
          + Add education
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Remove entries</CardTitle>
          <CardDescription>Pick an entry, then delete it.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <DeletePicker
            action="/cms/api/about/experience/delete"
            options={props.experience.map((e) => ({ id: String(e.id), label: `${e.id} — ${e.role} @ ${e.company}` }))}
            emptyLabel="No experience entries"
          />
          <DeletePicker
            action="/cms/api/about/skills/delete"
            options={props.skills.map((s) => ({ id: String(s.id), label: `${s.id} — ${s.heading}` }))}
            emptyLabel="No skill categories"
          />
          <DeletePicker
            action="/cms/api/about/education/delete"
            options={props.education.map((e) => ({ id: String(e.id), label: `${e.id} — ${e.title}` }))}
            emptyLabel="No education entries"
          />
        </CardContent>
      </Card>
    </CmsShell>
  )
}

function DeletePicker({
  action,
  options,
  emptyLabel
}: {
  action: string
  options: { id: string; label: string }[]
  emptyLabel: string
}) {
  const [value, setValue] = React.useState(options[0]?.id ?? "")

  if (options.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="destructive" disabled>
          Delete
        </Button>
        <span className="text-sm text-muted-foreground">{emptyLabel}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="grow max-w-56">
          <SelectValue placeholder="Entry to remove" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          if (!window.confirm("Delete this entry?")) return
          void postAction(action, { id: value })
        }}
      >
        Delete
      </Button>
    </div>
  )
}
export default AboutView;
