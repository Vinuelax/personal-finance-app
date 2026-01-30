"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { useData } from "@/lib/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Bell,
  Moon,
  Sun,
  Smartphone,
  Shield,
  Download,
  Trash2,
  LogOut,
  ChevronRight,
  CreditCard,
  Globe,
  HelpCircle,
  FileText,
  Lock,
} from "lucide-react"
import { useRouter } from "next/navigation"

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
]

export default function SettingsPage() {
  const { user, updateUser, currency, setCurrency, clearAllData } = useData()
  const router = useRouter()
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    budgetAlerts: true,
    billReminders: true,
    weeklyReport: true,
  })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  // Theme handling
  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | "system" | null
    if (stored) setTheme(stored)
  }, [])

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    
    if (newTheme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      document.documentElement.classList.toggle("dark", isDark)
    } else {
      document.documentElement.classList.toggle("dark", newTheme === "dark")
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem("ledger_onboarded")
    router.push("/welcome")
  }

  const handleDeleteAccount = () => {
    if (deleteConfirmText === "DELETE") {
      clearAllData()
      localStorage.removeItem("ledger_onboarded")
      router.push("/welcome")
    }
  }

  const handleExportData = () => {
    const data = localStorage.getItem("ledger_data")
    if (data) {
      const blob = new Blob([data], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ledger-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 md:pb-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                <AvatarFallback className="text-lg">
                  {user?.name?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{user?.name || "User"}</p>
                <p className="text-sm text-muted-foreground">{user?.email || "user@example.com"}</p>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
              </div>
              <Select value={theme} onValueChange={(v) => handleThemeChange(v as "light" | "dark" | "system")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Currency */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Currency</p>
                  <p className="text-sm text-muted-foreground">Set your default currency</p>
                </div>
              </div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.symbol}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive push notifications</p>
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Budget Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when nearing budget limits</p>
              </div>
              <Switch
                checked={notifications.budgetAlerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, budgetAlerts: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Bill Reminders</p>
                <p className="text-sm text-muted-foreground">Get reminded about upcoming bills</p>
              </div>
              <Switch
                checked={notifications.billReminders}
                onCheckedChange={(checked) => setNotifications({ ...notifications, billReminders: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly Report</p>
                <p className="text-sm text-muted-foreground">Receive weekly spending summary</p>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <button className="flex items-center justify-between py-3 text-left transition-colors hover:bg-muted/50 -mx-6 px-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">Update your password</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <Separator />

            <button className="flex items-center justify-between py-3 text-left transition-colors hover:bg-muted/50 -mx-6 px-6">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Data & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button variant="outline" className="justify-start gap-3 bg-transparent" onClick={handleExportData}>
              <Download className="h-4 w-4" />
              Export Data
            </Button>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="justify-start gap-3 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. All your data will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Type <span className="font-mono font-semibold">DELETE</span> to confirm:
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "DELETE"}
                  >
                    Delete Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4" />
              Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <button className="flex items-center justify-between py-3 text-left transition-colors hover:bg-muted/50 -mx-6 px-6">
              <p className="font-medium">Help Center</p>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <Separator />
            <button className="flex items-center justify-between py-3 text-left transition-colors hover:bg-muted/50 -mx-6 px-6">
              <p className="font-medium">Contact Support</p>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <Separator />
            <button className="flex items-center justify-between py-3 text-left transition-colors hover:bg-muted/50 -mx-6 px-6">
              <p className="font-medium">Privacy Policy</p>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <Separator />
            <button className="flex items-center justify-between py-3 text-left transition-colors hover:bg-muted/50 -mx-6 px-6">
              <p className="font-medium">Terms of Service</p>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="gap-2 bg-transparent"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground">
          Ledger v1.0.0
        </p>
      </div>
    </AppShell>
  )
}
