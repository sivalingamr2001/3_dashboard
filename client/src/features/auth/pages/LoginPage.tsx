import { Button } from "@/shared/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/card"
import {
    Field,
    FieldGroup,
    FieldLabel
} from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import React, { useState } from "react"

export function LoginPage() {
    const { login } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 1. Turned this into an async function to wait for the API call
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            await login(email, password)
        } catch (err) {
            setError("Invalid credentials or server connection error.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col gap-6")}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                    <CardDescription>
                        Login with your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* 3. Replaced button onClick with the correct onSubmit on the form element */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                {/* 4. Added name="email" attribute */}
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <a
                                        href="#"
                                        className="ml-auto text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                {/* 5. Added name="password" attribute */}
                                <Input id="password" name="password" type="password" required />
                            </Field>
                        </FieldGroup>
                        
                        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                        
                        {/* 6. Button handles submission cleanly and manages dynamic loading states */}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
