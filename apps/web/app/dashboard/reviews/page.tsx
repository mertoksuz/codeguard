import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ReviewsPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900">Reviews</h1>
          <p className="text-surface-500 mt-1">All your PR analysis results</p>
        </div>
      </div>
      <Card>
        <div className="p-8 text-center text-surface-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Share a PR link in Slack or connect GitHub webhooks to get started</p>
        </div>
      </Card>
    </div>
  );
}
