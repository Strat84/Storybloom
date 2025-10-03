import dayjs from "dayjs";

type UpdateQuery = {
  UpdateExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
};

export const generateUpdateQuery = (data: Record<string, unknown>): UpdateQuery => {
  const exp: UpdateQuery = {
    UpdateExpression: "set",
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {},
  };

  Object.entries(data).forEach(([key, item]) => {
    exp.UpdateExpression += ` #${key} = :${key},`;
    exp.ExpressionAttributeNames[`#${key}`] = key;
    exp.ExpressionAttributeValues[`:${key}`] = item;
  });

  exp.UpdateExpression += " #updatedAt = :updatedAt,";
  exp.ExpressionAttributeNames["#updatedAt"] = "updatedAt";
  exp.ExpressionAttributeValues[":updatedAt"] = dayjs().unix();

  exp.UpdateExpression = exp.UpdateExpression.slice(0, -1);

  return exp;
};
