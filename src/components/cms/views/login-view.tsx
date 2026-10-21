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
import { Alert as AlertUi } from "@src/components/ui/alert"
import { submitForm } from "@src/components/cms/helpers"

export type LoginViewProps = {
  configured: boolean
  error: string
}

const errorMessages: Record<string, string> = {
  rate: "Too many failed attempts. Try again in a few minutes.",
  config: "Server configuration error — see server logs.",
  invalid: "Invalid username or password."
}

export function LoginView(props: LoginViewProps) {
  const message = props.error ? errorMessages[props.error] || "Invalid username or password." : ""

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Devfolio CMS</CardTitle>
              <CardDescription>Sign in to manage your site.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!props.configured && (
                <AlertUi className="border-amber-200 bg-amber-50 text-amber-800">
                  <p className="text-sm">
                    Credentials are not configured yet. Add <code>CMS_USERNAME</code> and{" "}
                    <code>CMS_PASSWORD</code> to your <code>.env</code> file and restart.
                  </p>
                </AlertUi>
              )}
              {message && (
                <AlertUi variant="destructive">
                  <p className="text-sm">{message}</p>
                </AlertUi>
              )}
              {props.configured && (
                <form
                  className="flex flex-col gap-3"
                  method="post"
                  action="/cms/api/login"
                  onSubmit={submitForm}
                >
                  <div className="grid gap-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      autoComplete="username"
                      autoCapitalize="none"
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <Button type="submit" className="mt-2 w-full">
                    Sign in
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
export default LoginView;
