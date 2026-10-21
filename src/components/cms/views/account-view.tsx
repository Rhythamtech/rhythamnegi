import * as React from "react"

import { KeyRound, ShieldCheck } from "lucide-react"

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

export type AccountViewProps = {
  user: string
  currentUsername: string
  siteTitle: string
  avatarUrl: string
  active: ActiveKey
  /** Initial sidebar state (from the sidebar_state cookie). */
  defaultOpen?: boolean
  notice: string
  isErrorNotice: boolean
}

export function AccountView(props: AccountViewProps) {
  return (
    <CmsShell
      user={props.user}
      siteTitle={props.siteTitle}
      avatarUrl={props.avatarUrl}
      active={props.active}
      defaultOpen={props.defaultOpen}
      title="Account"
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Account &amp; security</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{props.currentUsername}</span>. Change
          the username or password used for the CMS.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound />
              Change credentials
            </CardTitle>
            <CardDescription>
              Your current password is required to save changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              method="post"
              action="/cms/api/account"
              onSubmit={submitForm}
            >
              <div className="grid gap-2">
                <Label htmlFor="current_password">Current password</Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  defaultValue={props.currentUsername}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  3–32 characters: letters, numbers, dots, dashes or underscores.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep the current password. At least 10 characters, mixing two of:
                  lowercase, uppercase, numbers, symbols.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirm_password">Confirm new password</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={200}
                />
              </div>

              <Button type="submit" className="mt-2 self-start">
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck />
              How it is stored
            </CardTitle>
            <CardDescription>Password handling for this CMS.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Passwords are stored as salted <span className="font-medium text-foreground">scrypt</span>{" "}
              hashes in SQLite. The plaintext value is never written to the database.
            </p>
            <p>
              <code>CMS_USERNAME</code> and <code>CMS_PASSWORD</code> in <code>.env</code> are only used
              once, to create the account on a fresh database. After that, the values above are
              authoritative — changing the environment does not overwrite them.
            </p>
            <p>
              Sessions are signed JWTs kept in an HttpOnly cookie. Changing credentials issues a new
              token for this browser; tokens on other devices stay valid until they expire.
            </p>
          </CardContent>
        </Card>
      </div>
    </CmsShell>
  )
}

export default AccountView
