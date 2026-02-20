import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendAnalysisResult(channel: string, threadTs: string | undefined, result: {
  prTitle: string; prUrl: string; prNumber: number; score: number;
  issues: Array<{ severity: string; ruleName: string; message: string; suggestion?: string }>;
}) {
  const blocks: any[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `🔍 *Analysis Complete — <${result.prUrl}|PR #${result.prNumber}>*\n${result.prTitle}` },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Score:* ${result.score}/100` },
        { type: "mrkdwn", text: `*Issues:* ${result.issues.length}` },
      ],
    },
  ];

  if (result.issues.length > 0) {
    const issueText = result.issues.slice(0, 5).map((i) => {
      const icon = i.severity === "error" ? "🔴" : i.severity === "warning" ? "🟡" : "🔵";
      let line = `${icon} *${i.ruleName}* — ${i.message}`;
      if (i.suggestion) {
        line += `\n      💡 _${i.suggestion}_`;
      }
      return line;
    }).join("\n");
    blocks.push({ type: "section", text: { type: "mrkdwn", text: issueText } });
  }

  blocks.push({
    type: "actions",
    elements: [
      { type: "button", text: { type: "plain_text", text: "🔧 Auto-Fix" }, style: "primary", action_id: "auto_fix" },
      { type: "button", text: { type: "plain_text", text: "📋 Full Report" }, action_id: "full_report" },
    ],
  });

  await slack.chat.postMessage({ channel, thread_ts: threadTs, blocks, text: `Analysis complete for PR #${result.prNumber}` });
}
