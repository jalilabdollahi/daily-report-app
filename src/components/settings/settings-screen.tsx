"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Camera, Eye, EyeOff, Loader2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { signOut, useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { UserAvatar } from "@/components/shared/user-avatar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteAccountSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "@/lib/validations/user";
import type {
  DeleteAccountInput,
  UpdatePasswordInput,
  UpdateProfileInput,
} from "@/lib/validations/user";
import type { ThemePreference, UserProfile } from "@/types/user";

async function fetchProfile() {
  const response = await fetch("/api/user/profile", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load your profile.");
  }

  const payload = (await response.json()) as { data: UserProfile };
  return payload.data;
}

async function updateProfile(values: UpdateProfileInput) {
  const response = await fetch("/api/user/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  const payload = (await response.json()) as
    | { data: UserProfile }
    | { error: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload ? payload.error : "Unable to update your profile.",
    );
  }

  if (!("data" in payload)) {
    throw new Error("Unable to update your profile.");
  }

  return payload.data;
}

async function updatePassword(values: UpdatePasswordInput) {
  const response = await fetch("/api/user/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  const payload = (await response.json()) as
    | { message: string; forceSignOut?: boolean }
    | { error: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload ? payload.error : "Unable to update your password.",
    );
  }

  if (!("message" in payload)) {
    throw new Error("Unable to update your password.");
  }

  return {
    forceSignOut: payload.forceSignOut ?? false,
    message: payload.message,
  };
}

async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch("/api/user/avatar", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as
    | { data: { avatarUrl: string } }
    | { error: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload ? payload.error : "Unable to upload your avatar.",
    );
  }

  if (!("data" in payload)) {
    throw new Error("Unable to upload your avatar.");
  }

  return payload.data.avatarUrl;
}

async function removeAvatar() {
  const response = await fetch("/api/user/avatar", {
    method: "DELETE",
  });

  const payload = (await response.json()) as
    | { data: { avatarUrl: null } }
    | { error: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload ? payload.error : "Unable to remove your avatar.",
    );
  }

  if (!("data" in payload)) {
    throw new Error("Unable to remove your avatar.");
  }

  return payload.data.avatarUrl;
}

async function updatePreferences(values: {
  theme: ThemePreference;
  reminderEnabled: boolean;
  reminderTime: string;
}) {
  const response = await fetch("/api/user/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  const payload = (await response.json()) as
    | {
        data: {
          theme: ThemePreference;
          reminderEnabled: boolean;
          reminderTime: string;
        };
      }
    | { error: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload ? payload.error : "Unable to update your preferences.",
    );
  }

  if (!("data" in payload)) {
    throw new Error("Unable to update your preferences.");
  }

  return payload.data;
}

async function deleteAccount(values: DeleteAccountInput) {
  const response = await fetch("/api/user/account", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  const payload = (await response.json()) as
    | { message: string }
    | { error: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload ? payload.error : "Unable to delete your account.",
    );
  }

  if (!("message" in payload)) {
    throw new Error("Unable to delete your account.");
  }

  return payload.message;
}

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password)) {
    score += 1;
  }

  if (score <= 1) {
    return { label: "Weak", value: 1 };
  }

  if (score <= 3) {
    return { label: "Medium", value: 2 };
  }

  return { label: "Strong", value: 3 };
}

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const { update } = useSession();
  const { setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [preferences, setPreferences] = useState<{
    theme: ThemePreference;
    reminderEnabled: boolean;
    reminderTime: string;
  }>({
    theme: "SYSTEM",
    reminderEnabled: true,
    reminderTime: "17:00",
  });

  const profileQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: fetchProfile,
  });

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const passwordForm = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const profile = profileQuery.data;

    if (!profile) {
      return;
    }

    profileForm.reset({
      name: profile.name,
      email: profile.email,
    });

    setPreferences({
      theme: profile.theme,
      reminderEnabled: profile.reminderEnabled,
      reminderTime: profile.reminderTime,
    });
  }, [profileForm, profileQuery.data]);

  useEffect(() => {
    if (!selectedAvatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedAvatarFile);
    setAvatarPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [selectedAvatarFile]);

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (data) => {
      queryClient.setQueryData<UserProfile>(["user-profile"], data);
      await update({
        name: data.name,
        email: data.email,
      });
      toast.success("Profile updated.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: async ({ forceSignOut, message }) => {
      passwordForm.reset();
      toast.success(message);
      if (forceSignOut) {
        await signOut({ callbackUrl: "/login" });
      }
    },
    onError: (error) => {
      passwordForm.setError("currentPassword", {
        message: error.message,
      });
      toast.error(error.message);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: async (avatarUrl) => {
      const currentProfile = profileQuery.data;

      if (currentProfile) {
        const nextProfile = {
          ...currentProfile,
          avatarUrl,
        };
        queryClient.setQueryData<UserProfile>(["user-profile"], nextProfile);
        await update({
          avatarUrl,
        });
      }

      setSelectedAvatarFile(null);
      toast.success("Avatar updated.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: removeAvatar,
    onSuccess: async () => {
      const currentProfile = profileQuery.data;

      if (currentProfile) {
        const nextProfile = {
          ...currentProfile,
          avatarUrl: null,
        };
        queryClient.setQueryData<UserProfile>(["user-profile"], nextProfile);
        await update({
          avatarUrl: null,
        });
      }

      setSelectedAvatarFile(null);
      toast.success("Avatar removed.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const preferencesMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: async (data) => {
      const currentProfile = profileQuery.data;

      if (currentProfile) {
        queryClient.setQueryData<UserProfile>(["user-profile"], {
          ...currentProfile,
          theme: data.theme,
          reminderEnabled: data.reminderEnabled,
          reminderTime: data.reminderTime,
        });
      }

      await update({
        theme: data.theme,
      });
    },
    onError: (error) => {
      toast.error(error.message);
      const profile = profileQuery.data;

      if (profile) {
        setPreferences({
          theme: profile.theme,
          reminderEnabled: profile.reminderEnabled,
          reminderTime: profile.reminderTime,
        });
        setTheme(profile.theme.toLowerCase());
      }
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      toast.success("Account deleted.");
      await signOut({ callbackUrl: "/login" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePreferencesChange = (
    nextValues: typeof preferences,
    {
      shouldApplyTheme = false,
    }: {
      shouldApplyTheme?: boolean;
    } = {},
  ) => {
    setPreferences(nextValues);

    if (shouldApplyTheme) {
      setTheme(nextValues.theme.toLowerCase());
    }

    preferencesMutation.mutate(nextValues);
  };

  const passwordStrength = getPasswordStrength(
    passwordForm.watch("newPassword") ?? "",
  );
  const profile = profileQuery.data;

  if (profileQuery.isError) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 shadow-soft">
        <CardContent className="p-6 text-sm text-destructive">
          {profileQuery.error.message}
        </CardContent>
      </Card>
    );
  }

  if (profileQuery.isLoading || !profile) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/80 px-6 py-8 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar
            avatarUrl={avatarPreviewUrl ?? profile.avatarUrl}
            name={profile.name}
            size="lg"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">
              Account settings
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Profile, appearance, and reminders
              </h1>
              <p className="text-sm text-muted-foreground">
                Keep your account details current and shape how the workspace
                feels every day.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{profile.role}</Badge>
          <Badge variant="accent">
            Joined {format(new Date(profile.createdAt), "MMMM d, yyyy")}
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Profile</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update the details other parts of the workspace use immediately.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-5 rounded-[1.5rem] border border-border/70 bg-secondary/35 p-5 sm:flex-row sm:items-center">
              <UserAvatar
                avatarUrl={avatarPreviewUrl ?? profile.avatarUrl}
                name={profile.name}
                size="lg"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium">Avatar</p>
                  <p className="text-sm text-muted-foreground">
                    Upload a JPG, PNG, GIF, or WebP image up to 2MB.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <input
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedAvatarFile(event.target.files?.[0] ?? null)
                    }
                    ref={fileInputRef}
                    type="file"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    variant="outline"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Choose image
                  </Button>
                  <Button
                    disabled={!selectedAvatarFile || avatarMutation.isPending}
                    onClick={() => {
                      if (selectedAvatarFile) {
                        avatarMutation.mutate(selectedAvatarFile);
                      }
                    }}
                    type="button"
                  >
                    {avatarMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload avatar
                  </Button>
                  {profile.avatarUrl || avatarPreviewUrl ? (
                    <Button
                      disabled={removeAvatarMutation.isPending}
                      onClick={() => removeAvatarMutation.mutate()}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <form
              className="space-y-5"
              onSubmit={profileForm.handleSubmit((values) =>
                profileMutation.mutate(values),
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="profile-name">
                    Name
                  </label>
                  <Input id="profile-name" {...profileForm.register("name")} />
                  {profileForm.formState.errors.name ? (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="profile-email"
                  >
                    Email
                  </label>
                  <Input
                    id="profile-email"
                    {...profileForm.register("email")}
                  />
                  {profileForm.formState.errors.email ? (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button disabled={profileMutation.isPending} type="submit">
                {profileMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Change your password with the same strength rules used during
              registration.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              className="space-y-5"
              onSubmit={passwordForm.handleSubmit((values) =>
                passwordMutation.mutate(values),
              )}
            >
              <PasswordField
                error={passwordForm.formState.errors.currentPassword?.message}
                id="current-password"
                label="Current password"
                register={passwordForm.register("currentPassword")}
                showPassword={showCurrentPassword}
                toggle={() => setShowCurrentPassword((current) => !current)}
              />
              <PasswordField
                error={passwordForm.formState.errors.newPassword?.message}
                id="new-password"
                label="New password"
                register={passwordForm.register("newPassword")}
                showPassword={showNewPassword}
                toggle={() => setShowNewPassword((current) => !current)}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Password strength</p>
                  <p className="text-sm text-muted-foreground">
                    {passwordStrength.label}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      className={`h-2 rounded-full ${
                        index < passwordStrength.value
                          ? "bg-primary"
                          : "bg-secondary"
                      }`}
                      key={index}
                    />
                  ))}
                </div>
              </div>
              <PasswordField
                error={passwordForm.formState.errors.confirmPassword?.message}
                id="confirm-password"
                label="Confirm new password"
                register={passwordForm.register("confirmPassword")}
                showPassword={showConfirmPassword}
                toggle={() => setShowConfirmPassword((current) => !current)}
              />
              <Button disabled={passwordMutation.isPending} type="submit">
                {passwordMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Appearance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose the theme you want the workspace to follow. Changes apply
              right away.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["LIGHT", "DARK", "SYSTEM"] as const).map((themeOption) => (
                <button
                  className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                    preferences.theme === themeOption
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/70 bg-background/70 hover:border-primary/25"
                  }`}
                  key={themeOption}
                  onClick={() =>
                    handlePreferencesChange(
                      {
                        ...preferences,
                        theme: themeOption,
                      },
                      { shouldApplyTheme: true },
                    )
                  }
                  type="button"
                >
                  <p className="font-medium">{themeOption}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {themeOption === "SYSTEM"
                      ? "Match your device preference."
                      : `Use the ${themeOption.toLowerCase()} workspace palette.`}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl">Reminders</CardTitle>
            <p className="text-sm text-muted-foreground">
              We will nudge you to log your daily tasks at the time you choose.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-border/70 bg-background/70 px-4 py-4">
              <div className="space-y-1">
                <p className="font-medium">Enable daily reminders</p>
                <p className="text-sm text-muted-foreground">
                  Turn on a daily reminder so your report is easier to finish on
                  time.
                </p>
              </div>
              <Checkbox
                checked={preferences.reminderEnabled}
                onCheckedChange={(checked) =>
                  handlePreferencesChange({
                    ...preferences,
                    reminderEnabled: checked === true,
                  })
                }
              />
            </label>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reminder-time">
                Reminder time
              </label>
              <Input
                disabled={
                  !preferences.reminderEnabled || preferencesMutation.isPending
                }
                id="reminder-time"
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    reminderTime: event.target.value,
                  }))
                }
                onBlur={(event) =>
                  handlePreferencesChange({
                    ...preferences,
                    reminderTime: event.target.value || "17:00",
                  })
                }
                type="time"
                value={preferences.reminderTime}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/20 bg-destructive/5 shadow-soft">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl text-destructive">
            Danger zone
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Deleting your account removes your tasks, history, activity, and
            avatar.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="font-medium">Delete account</p>
            <p className="text-sm text-muted-foreground">
              Type your email address to confirm that you want to permanently
              remove everything.
            </p>
          </div>
          <AlertDialog
            onOpenChange={setIsDeleteDialogOpen}
            open={isDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button variant="outline">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Enter {profile.email} to
                  confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="delete-account-email"
                >
                  Confirm email
                </label>
                <Input
                  id="delete-account-email"
                  onChange={(event) =>
                    setDeleteConfirmationEmail(event.target.value)
                  }
                  value={deleteConfirmationEmail}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setDeleteConfirmationEmail("")}
                  type="button"
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  disabled={
                    deleteAccountMutation.isPending ||
                    deleteConfirmationEmail !== profile.email
                  }
                  onClick={() =>
                    deleteAccountMutation.mutate(
                      deleteAccountSchema.parse({
                        email: deleteConfirmationEmail,
                      }),
                    )
                  }
                  type="button"
                >
                  {deleteAccountMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Delete permanently
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordField({
  error,
  id,
  label,
  register,
  showPassword,
  toggle,
}: {
  id: string;
  label: string;
  error?: string;
  register: UseFormRegisterReturn;
  showPassword: boolean;
  toggle: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          {...register}
        />
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          onClick={toggle}
          type="button"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
