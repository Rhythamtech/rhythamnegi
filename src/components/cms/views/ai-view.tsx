import * as React from "react"

import { KeyRound, PlugZap, Sparkles } from "lucide-react"

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
import { CmsShell, type ActiveKey } from "@src/components/cms/shell"
import { submitForm } from "@src/components/cms/helpers"

export type AiStatus = {
  baseUrl: string
  baseUrlSource: "cms" | "env"
  model: string
  modelSource: "cms" | "env"
  apiKeySource: "cms" | "env" | "none"
  apiKeyHint: string
  storedKeyUnreadable: boolean
}

export type AiViewProps = {
  user: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  defaultOpen?: boolean
  notice: string
  isErrorNotice: boolean
  status: AiStatus
}

type TestResult = { ok: boolean; message: string }

function SourceBadge(props: { source: string }) {
  return (
    <span className="ml-2 rounded-md border px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
      {props.source === "env" ? "from .env" : "from CMS"}
    </span>
  )
}

export function AiView(props: AiViewProps) {
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<TestResult | null>(null)

  async function testConnection(): Promise<void> {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/cms/api/ai/config/test", { method: "POST" })
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; error?: string }
        | null
      setTestResult({
        ok: Boolean(data?.ok),
        message: String(data?.message || data?.error || `Request failed (${res.status}).`)
      })
    } catch {
      setTestResult({ ok: false, message: "Could not reach the server." })
    } finally {
      setTesting(false)
    }
  }

  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="AI Assist"
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight">AI Assist</h1>
        <p className="text-sm text-muted-foreground">
          OpenAI-compatible provider used by the post editor — Groq, OpenAI, OpenRouter, Ollama,
          LM Studio, vLLM…
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

      {props.status.storedKeyUnreadable ? (
        <Card className="border-amber-200 bg-amber-50 py-3">
          <CardContent className="text-sm text-amber-800 px-4 py-0">
            A stored API key exists but cannot be decrypted — <code>AI_SECRET</code> probably
            changed. Enter the key again, or remove it.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles />
              Provider settings
            </CardTitle>
            <CardDescription>
              Values saved here override <code>.env</code>. Leave a field blank to use the
              environment value.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              method="post"
              action="/cms/api/ai/config"
              onSubmit={submitForm}
            >
              <div className="grid gap-2">
                <Label htmlFor="base_url">
                  Base URL
                  <SourceBadge source={props.status.baseUrlSource} />
                </Label>
                <Input
                  id="base_url"
                  name="base_url"
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="https://api.groq.com/openai/v1"
                  defaultValue={props.status.baseUrlSource === "cms" ? props.status.baseUrl : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Must expose <code>/chat/completions</code>. Plain http is only accepted for
                  localhost / LAN addresses.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model">
                  Model
                  <SourceBadge source={props.status.modelSource} />
                </Label>
                <Input
                  id="model"
                  name="model"
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="llama-3.3-70b-versatile"
                  defaultValue={props.status.modelSource === "cms" ? props.status.model : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Effective model: <span className="font-medium text-foreground">{props.status.model}</span>
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="api_key">
                  API key
                  {props.status.apiKeySource !== "none" ? (
                    <SourceBadge source={props.status.apiKeySource} />
                  ) : null}
                </Label>
                <Input
                  id="api_key"
                  name="api_key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={
                    props.status.apiKeyHint
                      ? `${props.status.apiKeyHint} — leave blank to keep the current key`
                      : "sk-…"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Stored encrypted (AES-256-GCM) and never shown again. Leave blank to keep the
                  existing key.
                </p>
              </div>

              {props.status.apiKeySource === "cms" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="clear_key" value="1" className="size-4" />
                  Remove the stored key and fall back to <code>AI_API_KEY</code>
                </label>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button type="submit">Save settings</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={testing}
                >
                  <PlugZap />
                  {testing ? "Testing…" : "Test saved settings"}
                </Button>
              </div>

              {testResult ? (
                <p
                  className={
                    testResult.ok
                      ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                      : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  }
                >
                  {testResult.ok ? "✓ " : "✗ "}
                  {testResult.message}
                  {testResult.ok ? " The post editor's AI assist is ready." : ""}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound />
              How the key is stored
            </CardTitle>
            <CardDescription>Encrypted, not hashed — and never sent to the browser.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              The provider key is encrypted with{" "}
              <span className="font-medium text-foreground">AES-256-GCM</span> before it is written
              to SQLite. Hashing is not possible here: the server must send the key to the provider
              in plaintext on every request.
            </p>
            <p>
              The encryption key is derived from <code>AI_SECRET</code> (32+ random characters)
              when set, otherwise from this installation's JWT secret. Set{" "}
              <code>AI_SECRET</code> in <code>.env</code> for production so a database copy alone
              cannot reveal the provider key.
            </p>
            <p>
              Changing <code>AI_SECRET</code> makes the stored key unreadable — re-enter it here
              afterwards. The CMS only ever displays a masked hint.
            </p>
          </CardContent>
        </Card>
      </div>
    </CmsShell>
  )
}

export default AiView
