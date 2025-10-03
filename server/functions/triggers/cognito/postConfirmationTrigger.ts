import { CognitoUserPoolTriggerEvent } from "aws-lambda";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import { createUser } from "server/services/dynamodb/user";
import { buildResponse } from "server/utils/buildResponse";

export const handler = async (event: CognitoUserPoolTriggerEvent) => {
    try {
        const attributes = event.request.userAttributes;
        if (!attributes.sub || !attributes.email) {
            return buildResponse(400, { message: "Missing required user attributes" });
        }

        const id = uuidv4();

        const item: Record<string, unknown> = {
            id: id,
            email: attributes.email,
            cognitoUserId: attributes.sub,
            createdAt: dayjs().unix(),
            updatedAt: dayjs().unix(),
        };

        if (attributes.name) {
            item.fullName = attributes.name;
        }

        console.log("Item to save in users table", item);

        await createUser(item);

        return event;
    } catch (error) {
        console.error("Error in postConfirmation trigger:", error);
        return buildResponse(500, { message: "Internal server error" });
    }
};
