import sendgrid from "@sendgrid/client";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "./lambda";

declare var process: {
  env: {
    SENDGRID_INDUSTRY_API_KEY: string;
    SENDGRID_MEDIA_API_KEY: string;
    SENDGRID_VISITORS_API_KEY: string;
  };
};

type SendgridContact = {
  address_line_1: String;
  address_line_2: String;
  alternate_emails: [String];
  city: String;
  country: String;
  created_at: String;
  custom_fields: {};
  email: String;
  facebook: String;
  first_name: String;
  id: String;
  last_name: String;
  line: String;
  list_ids: [String];
  phone_number: String;
  postal_code: String;
  state_province_region: String;
  unique_name: String;
  updated_at: String;
  whatsapp: String;
};

type Contact = {
  email: String;
  firstName: String;
  id?: String;
  lastName: String;
  listIds: String[];
};

type SendgridList = {
  name: String;
  id: String;
  contact_count: Number;
};

type List = {
  id: String;
  isSubscribed: boolean;
  name: String;
};

async function getContact(email: String) {
  const response = await sendgrid.request({
    method: "POST",
    url: "/v3/marketing/contacts/search",
    body: JSON.stringify({
      query: `lower(email) = lower('${email}')`,
    }),
  });

  const rawContact = (response[1].result as SendgridContact[])[0];

  if (rawContact) {
    return {
      email: rawContact.email,
      firstName: rawContact.first_name,
      id: rawContact.id,
      lastName: rawContact.last_name,
      listIds: rawContact.list_ids,
    } as Contact;
  }

  return {
    email,
    firstName: "",
    lastName: "",
    listIds: [],
  } as Contact;
}

function compareLists(a: List, b: List) {
  const aName = a.name.replace(/\[.*\] /, "");
  const bName = b.name.replace(/\[.*\] /, "");

  if (aName < bName) {
    return -1;
  }
  if (aName > bName) {
    return 1;
  }
  return 0;
}

async function getLists() {
  const response = await sendgrid.request({
    method: "GET",
    url: "/v3/marketing/lists",
  });

  const rawLists = response[1].result as SendgridList[];

  const lists = rawLists
    .map(function (rawList) {
      return {
        id: rawList.id,
        isSubscribed: false,
        name: rawList.name,
      } as List;
    })
    .sort(compareLists);

  return lists;
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  type Data = {
    contactId: String;
    firstName: String;
    lastName: String;
    email: String;
    lists: List[];
  };

  let lists: List[];
  let emailInput = "";

  let apiKey:
    | "SENDGRID_INDUSTRY_API_KEY"
    | "SENDGRID_MEDIA_API_KEY"
    | "SENDGRID_VISITORS_API_KEY" = "SENDGRID_VISITORS_API_KEY";

  if (event.queryStringParameters) {
    emailInput = event.queryStringParameters["email"] || "";

    if (event.queryStringParameters["account"] === "industry") {
      apiKey = "SENDGRID_INDUSTRY_API_KEY";
    }

    if (event.queryStringParameters["account"] === "media") {
      apiKey = "SENDGRID_MEDIA_API_KEY";
    }
  }

  sendgrid.setApiKey(process.env[apiKey]);

  let contact: Contact;

  try {
    contact = await getContact(emailInput);
  } catch (error) {
    console.log(error);
    console.log(error.response.body.errors);

    return {
      body: JSON.stringify({ error: "Something went wrong" }),
      statusCode: 400,
    };
  }

  lists = await getLists();

  lists.forEach(function (list) {
    list.isSubscribed = contact.listIds.includes(list.id);
  });

  const data = {
    contactId: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    lists,
  } as Data;

  return {
    body: JSON.stringify(data),
    statusCode: 200,
  };
}
