import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback, ServerlessFunctionSignature } from '@twilio-labs/serverless-runtime-types/types';
import { functionValidator as FunctionTokenValidator, validator as TokenValidator } from 'twilio-flex-token-validator';
import fetch from 'node-fetch';

type MyEvent = {
  hubspot_id: string;
  Token: string;
}

type MyContext = {
  ACCOUNT_SID: string;
  AUTH_TOKEN: string;
}

type HubspotContact = {
  id: string;
  properties: {
    email: string;
    firstname: string;
    lastname: string;
  }
}

// @ts-ignore
export const handler: ServerlessFunctionSignature<MyContext, MyEvent> = FunctionTokenValidator(async function (
  context: Context<MyContext>,
  event: MyEvent,
  callback: ServerlessCallback
) {

  const {
    hubspot_id,
    Token
  } = event;

  try {

    const openTemplateFile = Runtime.getAssets()['/templates.json'].open;
    const templateRaw = JSON.parse(openTemplateFile()) as string[];

    const client = context.getTwilioClient();

    const request = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${hubspot_id}`, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`
      }
    });

    if (!request.ok) {
      throw new Error('Error while retrieving data from hubspot');
    }

    const contactInformation = await request.json() as HubspotContact;

    const tokenInformation = await TokenValidator(Token, context.ACCOUNT_SID || '', context.AUTH_TOKEN || '') as {
      identity: string;
    };

    const workerInformation = await client.conversations.v1.users(tokenInformation.identity).fetch();

    const template = templateRaw.map(item => {

      let formattedItem = item.replace(/{{customerFirstName}}/, contactInformation.properties.firstname);
      formattedItem = formattedItem.replace(/{{customerLastName}}/, contactInformation.properties.lastname);
      formattedItem = formattedItem.replace(/{{agentName}}/, workerInformation.friendlyName);

      return formattedItem;
    });

    const response = new Twilio.Response();
    response.appendHeader("Access-Control-Allow-Origin", "*");
    response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST GET");
    response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

    response.appendHeader("Content-Type", "application/json");
    response.setBody(template);
    // Return a success response using the callback function.
    callback(null, response);


  } catch (err) {

    if (err instanceof Error) {
      const response = new Twilio.Response();
      response.appendHeader("Access-Control-Allow-Origin", "*");
      response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST GET");
      response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

      response.appendHeader("Content-Type", "plain/text");
      response.setBody(err.message);
      response.setStatusCode(500);
      // If there's an error, send an error response
      // Keep using the response object for CORS purposes
      console.error(err);
      callback(null, response);
    } else {
      callback(null, {});
    }

  }
})