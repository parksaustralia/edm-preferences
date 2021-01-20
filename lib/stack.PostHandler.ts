import sendgrid from "@sendgrid/client";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "./lambda";

declare var process: {
  env: {
    SENDGRID_INDUSTRY_API_KEY: string;
    SENDGRID_MEDIA_API_KEY: string;
    SENDGRID_VISITORS_API_KEY: string;
  };
};

type ApiKey =
  | "SENDGRID_INDUSTRY_API_KEY"
  | "SENDGRID_MEDIA_API_KEY"
  | "SENDGRID_VISITORS_API_KEY";

type SendgridContact = {
  address_line_1?: String;
  address_line_2?: String;
  alternate_emails?: String[];
  city?: String;
  country?: String;
  email: String;
  first_name?: String;
  last_name?: String;
  postal_code?: String;
  state_province_region?: String;
  custom_fields?: {};
};

type UpdateContactRequestBody = {
  contacts: SendgridContact[];
  list_ids: String[];
};

type FormInput = {
  account?: "visitors" | "media" | "industry";
  contactId?: String;
  email: String;
  firstName?: String;
  lastName?: String;
  listIds: String[];
};

async function updateContact(input: FormInput) {
  await postContact(input);

  return {
    body: JSON.stringify({ message: "Your preferences have been updated" }),
    statusCode: 200,
  };
}

async function createContact(input: FormInput) {
  await postContact(input);

  return {
    body: JSON.stringify({ message: "Subscription created" }),
    statusCode: 200,
  };
}

async function postContact(input: FormInput) {
  const body = {
    contacts: [
      {
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
      } as SendgridContact,
    ],
    list_ids: input.listIds,
  } as UpdateContactRequestBody;

  console.log(`Updating contact ${JSON.stringify(body)}`);

  const response = await sendgrid.request({
    body,
    method: "PUT",
    url: "/v3/marketing/contacts",
  });

  return response[1].result;
}

async function getCurrentLists(contactId: String) {
  console.log(`Getting current lists for ${contactId}`);
  const response = await sendgrid.request({
    method: "GET",
    url: `/v3/marketing/contacts/${contactId}`,
  });

  return response[1].list_ids as String[];
}

async function removeFromLists(contactId: String, listIds: String[]) {
  await Promise.all(
    listIds.map(async (listId) => {
      try {
        await removeContactFromList(contactId, listId);
      } catch (error) {
        console.log(error);
      }
    })
  );
}

async function removeContactFromList(contactId: String, listId: String) {
  console.log(`Removing contact ${contactId} from list ${listId}`);
  const response = await sendgrid.request({
    method: "DELETE",
    url: `/v3/marketing/lists/${listId}/contacts`,
    qs: {
      contact_ids: contactId,
    },
  });

  return response[1].result;
}

async function deleteContact(id: String) {
  console.log(`Deleting contact ${id}`);

  await sendgrid.request({
    method: "DELETE",
    url: "/v3/marketing/contacts",
    qs: {
      ids: id,
    },
  });

  return {
    body: JSON.stringify({
      message: "You are now unsubscribed from all mailing lists",
    }),
    statusCode: 200,
  };
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  if (!event.body) {
    return {
      body: JSON.stringify({ error: "No payload provided" }),
      statusCode: 400,
    };
  }

  const formInput = JSON.parse(event.body) as FormInput;

  const apiKey: ApiKey =
    {
      visitors: "SENDGRID_VISITORS_API_KEY" as ApiKey,
      industry: "SENDGRID_INDUSTRY_API_KEY" as ApiKey,
      media: "SENDGRID_MEDIA_API_KEY" as ApiKey,
    }[formInput.account || "visitors"] || "SENDGRID_VISITORS_API_KEY";

  sendgrid.setApiKey(process.env[apiKey]);

  if (formInput.contactId) {
    if (formInput.listIds.length) {
      const currentListIds = await getCurrentLists(formInput.contactId);
      const listsToRemove = currentListIds.filter(
        (listId) => !formInput.listIds.includes(listId)
      );
      await removeFromLists(formInput.contactId, listsToRemove);
      return await updateContact(formInput);
    } else {
      return await deleteContact(formInput.contactId);
    }
  }

  return await createContact(formInput);
}
