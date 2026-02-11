export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-surface-900">Settings</h1>
        <p className="text-surface-500 mt-1">Manage your account and team settings</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Name</label>
              <input type="text" defaultValue="Mert" className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
              <input type="email" defaultValue="mert@codeguard.ai" className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
            </div>
            <Button size="sm">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl">
              <div>
                <div className="font-semibold text-surface-900">Free Plan</div>
                <div className="text-sm text-surface-500">23 of 50 reviews used this month</div>
              </div>
              <Button variant="outline" size="sm">Upgrade to Pro</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" size="sm">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
