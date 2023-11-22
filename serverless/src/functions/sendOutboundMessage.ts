import '@twilio-labs/serverless-runtime-types';
import { Context, ServerlessCallback } from '@twilio-labs/serverless-runtime-types/types';
import { functionValidator as FunctionTokenValidator, validator as TokenValidator } from 'twilio-flex-token-validator';

const openAChatTask: (client: any,
  To: string,
  customerName: string,
  From: string,
  Body: string,
  WorkerConversationIdentity: string,
  channel: string,
  hubspot_contact_id: string,
  routingProperties: object) => Promise<{
    success: boolean;
    interactionSid: string;
    conversationSid: string;
  }> = async (
    client,
    To,
    customerName,
    From,
    Body,
    WorkerConversationIdentity,
    channel,
    hubspot_contact_id,
    routingProperties
  ) => {

    const interaction = await client.flexApi.v1.interaction.create({
      channel: {
        type: channel,
        initiated_by: "agent",
        participants: [
          {
            address: To,
            proxy_address: From,
          },
        ],
      },
      routing: {
        properties: {
          ...routingProperties,
          task_channel_unique_name: channel === 'whatsapp' ? 'chat' : channel,
          attributes: {
            name: customerName,
            hubspot_contact_id: hubspot_contact_id,
            from: To,
            direction: "outbound",
            customerName: customerName,
            customerAddress: To,
            twilioNumber: From,
            channelType: channel
          },
        },
      }
    });

    const taskAttributes = JSON.parse(interaction.routing.properties.attributes);

    await client.conversations
      .v1
      .conversations(taskAttributes.conversationSid)
      .messages.create({ author: WorkerConversationIdentity, body: Body });

    return {
      success: true,
      interactionSid: interaction.sid,
      conversationSid: taskAttributes.conversationSid
    };
  };

const sendOutboundMessage: (
  client: any,
  To: string,
  From: string,
  Body: string,
  KnownAgentRoutingFlag: boolean,
  WorkerFriendlyName: string,
  WorkerConversationIdentity: string,
  studioFlowSid: string) => Promise<{
    success: boolean;
    channelSid: string;
  }> = async (
    client,
    To,
    From,
    Body,
    KnownAgentRoutingFlag,
    WorkerFriendlyName,
    WorkerConversationIdentity,
    studioFlowSid
  ) => {
    const friendlyName = `Outbound ${From} -> ${To}`;

    // Set flag in channel attribtues so Studio knows if it should set task attribute to target known agent
    let converstationAttributes: any = { KnownAgentRoutingFlag };
    if (KnownAgentRoutingFlag)
      converstationAttributes.KnownAgentWorkerFriendlyName = WorkerFriendlyName;
    const attributes = JSON.stringify(converstationAttributes);

    // Create Channel
    const channel = await client.conversations.conversations.create({
      friendlyName,
      attributes
    });

    // Add customer to channel
    await client.conversations
      .v1
      .conversations(channel.sid)
      .participants.create({
        'messagingBinding.address': To,
        'messagingBinding.proxyAddress': From
      });

    // Point the channel to Studio
    await client.conversations
      .v1
      .conversations(channel.sid)
      .webhooks.create({
        target: "studio",
        "configuration.flowSid": studioFlowSid,
      });

    // Add agents initial message
    await client.conversations
      .v1
      .conversations(channel.sid)
      .messages.create({ author: WorkerConversationIdentity, body: Body });

    return { success: true, channelSid: channel.sid };
  };


type MyEvent = {
  To: string;
  Body: string;
  customerName: string;
  WorkerFriendlyName: string;
  OpenChatFlag: string;
  hubspot_contact_id: string;
  KnownAgentRoutingFlag: boolean;
  Token: string;
}

type MyContext = {
  ACCOUNT_SID: string;
  AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  TWILIO_WA_PHONE_NUMBER: string;
  TASK_ROUTER_WORKSPACE_SID: string;
  TASK_ROUTER_WORKFLOW_SID: string;
  TASK_ROUTER_QUEUE_SID: string;
  INBOUND_SMS_STUDIO_FLOW: string;
}

// @ts-ignore
export const handler: ServerlessFunctionSignature<MyContext, MyEvent> = FunctionTokenValidator(async function (
  context: Context<MyContext>,
  event: MyEvent,
  callback: ServerlessCallback
) {

  const {
    To,
    Body,
    customerName,
    hubspot_contact_id,
    WorkerFriendlyName,
    Token
  } = event;

  let { OpenChatFlag, KnownAgentRoutingFlag } = event;

  const channel = To.includes('whatsapp') ? 'whatsapp' : 'sms';
  const From = channel === 'whatsapp' ? `whatsapp:${context.TWILIO_WA_PHONE_NUMBER}` : context.TWILIO_PHONE_NUMBER;
  const client = context.getTwilioClient();

  console.log(`To : ${To}`);
  console.log(`From : ${From}`);

  // Create a custom Twilio Response
  // Set the CORS headers to allow Flex to make an HTTP request to the Twilio Function
  const response = new Twilio.Response();
  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST GET");
  response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    let sendResponse = null;

    const tokenInformation = await TokenValidator(Token, context.ACCOUNT_SID || '', context.AUTH_TOKEN || '') as {
      identity: string;
      roles: string[];
      worker_sid: string;
    };

    const {
      worker_sid,
      identity
    } = tokenInformation;

    if (OpenChatFlag) {
      // create task and add the message to a channel
      sendResponse = await openAChatTask(
        client,
        To,
        customerName,
        From,
        Body,
        identity,
        channel,
        hubspot_contact_id,
        {
          workspace_sid: context.TASK_ROUTER_WORKSPACE_SID,
          workflow_sid: context.TASK_ROUTER_WORKFLOW_SID,
          queue_sid: context.TASK_ROUTER_QUEUE_SID,
          worker_sid: worker_sid
        }
      );
    } else {
      // create a channel but wait until customer replies before creating a task
      sendResponse = await sendOutboundMessage(
        client,
        To,
        From,
        Body,
        KnownAgentRoutingFlag,
        WorkerFriendlyName,
        identity,
        context.INBOUND_SMS_STUDIO_FLOW
      );

    }

    response.appendHeader("Content-Type", "application/json");
    response.setBody(sendResponse);
    // Return a success response using the callback function.
    callback(null, response);
  } catch (err) {

    if (err instanceof Error) {
      response.appendHeader("Content-Type", "plain/text");
      response.setBody(err.message);
      response.setStatusCode(500);
      // If there's an error, send an error response
      // Keep using the response object for CORS purposes
      callback(null, response);
    } else {
      callback(null, {});
    }

  }
});