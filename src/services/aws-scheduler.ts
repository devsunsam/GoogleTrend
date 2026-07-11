import {
  EventBridgeClient,
  DescribeRuleCommand,
  PutRuleCommand,
} from "@aws-sdk/client-eventbridge";
import {
  SchedulerClient,
  GetScheduleCommand,
  UpdateScheduleCommand,
} from "@aws-sdk/client-scheduler";
import { buildRateExpression } from "@/lib/settings-migrate";
import type { AppSettings } from "@/types";

export interface SchedulerSyncResult {
  ok: boolean;
  expression: string;
  message: string;
  scheduleType?: AppSettings["awsScheduleType"];
}

function resolveAwsCredentials(settings: AppSettings) {
  const accessKeyId =
    settings.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID || undefined;
  const secretAccessKey =
    settings.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || undefined;

  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey };
  }

  return undefined;
}

function resolveRegion(settings: AppSettings): string {
  return settings.awsRegion || process.env.AWS_REGION || "ap-northeast-2";
}

function resolveScheduleType(settings: AppSettings): AppSettings["awsScheduleType"] {
  if (settings.awsScheduleType === "rule") return "rule";
  if (settings.awsEventBridgeRuleName && !settings.awsSchedulerName) return "rule";
  return "scheduler";
}

export function canSyncAwsSchedule(settings: AppSettings): boolean {
  const type = resolveScheduleType(settings);
  if (type === "rule") {
    return Boolean(
      settings.awsEventBridgeRuleName ||
        process.env.AWS_EVENTBRIDGE_RULE_NAME
    );
  }
  return Boolean(settings.awsSchedulerName || process.env.AWS_SCHEDULER_NAME);
}

export async function syncTrendSchedule(
  settings: AppSettings
): Promise<SchedulerSyncResult> {
  const expression = buildRateExpression(settings.trendMinutes);
  const region = resolveRegion(settings);
  const credentials = resolveAwsCredentials(settings);
  const clientConfig = { region, credentials };

  const scheduleType = resolveScheduleType(settings);

  try {
    if (scheduleType === "rule") {
      return await syncEventBridgeRule(settings, expression, clientConfig);
    }
    return await syncEventBridgeScheduler(settings, expression, clientConfig);
  } catch (error) {
    return {
      ok: false,
      expression,
      message:
        error instanceof Error ? error.message : "AWS 스케줄러 동기화 실패",
      scheduleType,
    };
  }
}

async function syncEventBridgeScheduler(
  settings: AppSettings,
  expression: string,
  clientConfig: { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } }
): Promise<SchedulerSyncResult> {
  const scheduleName =
    settings.awsSchedulerName || process.env.AWS_SCHEDULER_NAME || "";
  const groupName =
    settings.awsSchedulerGroup || process.env.AWS_SCHEDULER_GROUP || "default";

  if (!scheduleName) {
    return {
      ok: false,
      expression,
      message: "AWS Scheduler 이름이 설정되지 않았습니다.",
      scheduleType: "scheduler",
    };
  }

  const client = new SchedulerClient(clientConfig);
  const existing = await client.send(
    new GetScheduleCommand({
      Name: scheduleName,
      GroupName: groupName,
    })
  );

  if (!existing.Target?.Arn || !existing.Target?.RoleArn) {
    return {
      ok: false,
      expression,
      message: "기존 스케줄의 Lambda 대상 정보를 찾을 수 없습니다.",
      scheduleType: "scheduler",
    };
  }

  await client.send(
    new UpdateScheduleCommand({
      Name: scheduleName,
      GroupName: groupName,
      ScheduleExpression: expression,
      ScheduleExpressionTimezone: existing.ScheduleExpressionTimezone,
      FlexibleTimeWindow: existing.FlexibleTimeWindow ?? { Mode: "OFF" },
      Target: existing.Target,
      State: existing.State ?? "ENABLED",
      Description: existing.Description,
      StartDate: existing.StartDate,
      EndDate: existing.EndDate,
      KmsKeyArn: existing.KmsKeyArn,
    })
  );

  return {
    ok: true,
    expression,
    message: `EventBridge Scheduler "${scheduleName}" 주기를 ${settings.trendMinutes}분으로 업데이트했습니다.`,
    scheduleType: "scheduler",
  };
}

async function syncEventBridgeRule(
  settings: AppSettings,
  expression: string,
  clientConfig: { region: string; credentials?: { accessKeyId: string; secretAccessKey: string } }
): Promise<SchedulerSyncResult> {
  const ruleName =
    settings.awsEventBridgeRuleName ||
    process.env.AWS_EVENTBRIDGE_RULE_NAME ||
    "";

  if (!ruleName) {
    return {
      ok: false,
      expression,
      message: "EventBridge Rule 이름이 설정되지 않았습니다.",
      scheduleType: "rule",
    };
  }

  const client = new EventBridgeClient(clientConfig);
  const existing = await client.send(
    new DescribeRuleCommand({ Name: ruleName })
  );

  await client.send(
    new PutRuleCommand({
      Name: ruleName,
      ScheduleExpression: expression,
      State: existing.State ?? "ENABLED",
      Description: existing.Description,
      EventBusName: existing.EventBusName,
      RoleArn: existing.RoleArn,
    })
  );

  return {
    ok: true,
    expression,
    message: `EventBridge Rule "${ruleName}" 주기를 ${settings.trendMinutes}분으로 업데이트했습니다.`,
    scheduleType: "rule",
  };
}
