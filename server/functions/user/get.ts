import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getUserByCognitoId } from "../../services/dynamodb/user/index";
import { buildResponse } from "../../utils/buildResponse";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event:", event);

  const cognitoUserId = event.requestContext.authorizer?.claims?.sub;

  if (!cognitoUserId) {
    console.log("No Cognito user ID found in token");
    return buildResponse(401, { message: "Unauthorized - No Cognito user ID found" });
  }

  const users = await getUserByCognitoId(cognitoUserId);
  if (!users || users.length === 0) {
    console.log("User not found for Cognito ID:", cognitoUserId);
    return buildResponse(404, { message: "User not found" });
  }
  return buildResponse(200, users[0]);
};