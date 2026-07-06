"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Parse callback errors from Auth.js
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "CredentialsSignin") {
      setAuthError("Invalid email or password. Please try again.");
    } else if (errorParam) {
      setAuthError("An unexpected authentication error occurred.");
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMeValue = watch("rememberMe");

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError("Invalid email or password. Please try again.");
        setIsLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setAuthError("Connection error. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 backdrop-blur-xl md:p-4">
      <CardHeader className="space-y-2 pb-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-100" />
          <span className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            ANNEX NETWORK
          </span>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-100">
          Annex Mail
        </CardTitle>
        <CardDescription className="text-sm text-zinc-400">
          Log in to access your shared business mailbox
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {authError && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-950/40 bg-red-950/20 px-3.5 py-3 text-sm text-red-400">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <p>{authError}</p>
            </div>
          )}

          <Field>
            <FieldLabel className="mb-1 text-xs font-medium tracking-wider text-zinc-300 uppercase">
              Email Address
            </FieldLabel>
            <div className="relative flex items-center">
              <Mail className="pointer-events-none absolute left-3.5 h-4.5 w-4.5 text-zinc-500" />
              <Input
                type="email"
                placeholder="name@company.com"
                disabled={isLoading}
                className="h-10 rounded-lg border-zinc-800 bg-zinc-900/50 pl-10.5 text-zinc-100 placeholder-zinc-600 focus-visible:border-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <FieldError className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel className="mb-1 text-xs font-medium tracking-wider text-zinc-300 uppercase">
              Password
            </FieldLabel>
            <div className="relative flex items-center">
              <Lock className="pointer-events-none absolute left-3.5 h-4.5 w-4.5 text-zinc-500" />
              <Input
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                className="h-10 rounded-lg border-zinc-800 bg-zinc-900/50 pl-10.5 text-zinc-100 placeholder-zinc-600 focus-visible:border-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <FieldError className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </FieldError>
            )}
          </Field>

          <div className="flex items-center justify-between py-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
              <Checkbox
                checked={rememberMeValue}
                onCheckedChange={(checked) => setValue("rememberMe", !!checked)}
                disabled={isLoading}
                className="rounded border-zinc-800 data-[state=checked]:bg-zinc-100 data-[state=checked]:text-zinc-950"
              />
              Remember me
            </label>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="flex h-10.5 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-100 font-medium text-zinc-950 transition-all hover:bg-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              "Log in"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 p-4 font-sans select-none">
      {/* Decorative dark mesh/ambient effect */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(10,10,10,0.8),rgba(0,0,0,1))]" />

      <Suspense
        fallback={
          <div className="flex h-40 w-full max-w-md items-center justify-center font-mono text-xs text-zinc-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading authentication module...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
