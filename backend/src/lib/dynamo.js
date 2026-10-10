/**
 * lib/dynamo.js
 * DynamoDB Document Client singleton + helper utilities.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const raw = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
export const ddb = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE = process.env.REPORTS_TABLE ?? 'DrainGuardReports';

/** Write a new report item. */
export async function putReport(item) {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
}

/** Fetch a single report by PK. Returns undefined if not found. */
export async function getReport(reportId) {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { reportId } })
  );
  return res.Item;
}

/**
 * Update a report's status fields.
 * @param {string} reportId
 * @param {object} fields  { status, updatedAt, resolvedAt?, verificationKey? }
 */
export async function updateReportStatus(reportId, fields) {
  const exprs = ['#st = :st', '#ua = :ua'];
  const names = { '#st': 'status', '#ua': 'updatedAt' };
  const values = { ':st': fields.status, ':ua': fields.updatedAt };

  if (fields.resolvedAt) {
    exprs.push('#ra = :ra');
    names['#ra'] = 'resolvedAt';
    values[':ra'] = fields.resolvedAt;
  }
  if (fields.verificationKey) {
    exprs.push('#vk = :vk');
    names['#vk'] = 'verificationKey';
    values[':vk'] = fields.verificationKey;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { reportId },
      UpdateExpression: 'SET ' + exprs.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(reportId)',
    })
  );
}

/**
 * List reports with optional filters.
 * Uses Scan (table is small; add GSI query in a later phase).
 * @param {{ status?, minPriority?, limit?, startKey?, includeDemo? }} opts
 */
export async function listReports({ status, minPriority, limit = 50, startKey, includeDemo } = {}) {
  const filterExprs = [];
  const names = {};
  const values = {};

  if (status) {
    filterExprs.push('#st = :st');
    names['#st'] = 'status';
    values[':st'] = status;
  }
  if (minPriority !== undefined) {
    filterExprs.push('#ps >= :mp');
    names['#ps'] = 'priorityScore';
    values[':mp'] = Number(minPriority);
  }
  if (includeDemo === false) {
    filterExprs.push('#dm = :dm');
    names['#dm'] = 'isDemo';
    values[':dm'] = false;
  }

  const params = {
    TableName: TABLE,
    Limit: Math.min(Number(limit), 100),
  };
  if (filterExprs.length) {
    params.FilterExpression = filterExprs.join(' AND ');
    params.ExpressionAttributeNames = names;
    params.ExpressionAttributeValues = values;
  }
  if (startKey) {
    params.ExclusiveStartKey = startKey;
  }

  const res = await ddb.send(new ScanCommand(params));
  return {
    items: res.Items ?? [],
    lastKey: res.LastEvaluatedKey,
  };
}
