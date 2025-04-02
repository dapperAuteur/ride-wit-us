"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { BackupSettings } from "@/types/settings"
import { useState, useEffect } from "react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: BackupSettings
  onSettingsChange: (settings: BackupSettings) => void
}

export default function SettingsDialog({ open, onOpenChange, settings, onSettingsChange }: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<BackupSettings>(() => ({ ...settings }))

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings({ ...settings })
  }, [settings])

  const handleSave = () => {
    onSettingsChange(localSettings)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Backup Settings</DialogTitle>
          <DialogDescription>Configure automatic backup settings for your activity data</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-backup" className="flex flex-col space-y-1">
              <span>Automatic Backup</span>
              <span className="font-normal text-sm text-muted-foreground">Automatically backup your data daily</span>
            </Label>
            <Switch
              id="auto-backup"
              checked={localSettings.enabled}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, enabled: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="backup-time">Backup Time</Label>
            <Input
              id="backup-time"
              type="time"
              value={localSettings.time}
              onChange={(e) => setLocalSettings({ ...localSettings, time: e.target.value })}
              disabled={!localSettings.enabled}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

