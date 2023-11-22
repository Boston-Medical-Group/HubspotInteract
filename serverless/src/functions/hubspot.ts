import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback } from '@twilio-labs/serverless-runtime-types/types';
import { functionValidator as FunctionTokenValidator } from 'twilio-flex-token-validator';
import fetch from "node-fetch";

type MyEvent = {
  crmid?: string;
  deal_id?: string;
}

type MyContext = {
}

const fetchByContact = async (crmid: string) => {
  const request = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${crmid}/?properties=email,firstname,lastname,phone,hs_object_id,reservar_cita`, {
    method: "GET",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`
    }
  });

  if (!request.ok) {
    throw new Error('Error while retrieving data from hubspot');
  }

  return await request.json();
}

const fetchByDeal = async (deal_id: string) => {
  const request = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${deal_id}/?associations=contacts`, {
    method: "GET",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`
    }
  });

  if (!request.ok) {
    console.log(request);
    throw new Error('Error while retrieving data from hubspot');
  }

  const deal = await request.json();
  console.log('found deal', deal);
  if (deal.associations?.contacts?.results?.length > 0) {
    const contactId = deal.associations.contacts.results[0].id;
    console.log('found contact', contactId);
    return await fetchByContact(contactId);
  } else {
    console.log('Conact not found in deal associations');
    throw new Error('Error while retrieving data from hubspot');
  }
}

// @ts-ignore
export const handler: ServerlessFunctionSignature<MyContext, MyEvent> = FunctionTokenValidator(async function (
  _: Context<MyContext>,
  event: MyEvent,
  callback: ServerlessCallback
) {
  const {
    crmid,
    deal_id
  } = event;

  try {
    let data;
    if (crmid) {
      data = await fetchByContact(crmid);
    } else if (deal_id) {
      data = await fetchByDeal(deal_id);
    } else {
      throw new Error('CONTACT ID (crmid) o DEAL ID Inválidos');
    }
    
    const response = new Twilio.Response();
    response.appendHeader("Access-Control-Allow-Origin", "*");
    response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST GET");
    response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

    response.appendHeader("Content-Type", "application/json");
    response.setBody(data);
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
