import { useCallback } from "react";

const useApi = ({ token }) => {

  async function loadHubspotData(data) {
    let bodytoSend = {};
    if (data.contact_id) {
      bodytoSend = {
        crmid: data.contact_id,
        Token: manager.store.getState().flex.session.ssoTokenPayload.token
      }
    } else if (data.deal_id) {
      bodytoSend = {
        deal_id: data.deal_id,
        Token: manager.store.getState().flex.session.ssoTokenPayload.token
      }
    } else {
      return;
    }

    const request = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/hubspot`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodytoSend)
    });

    return await request.json();
  }

  const getDataByContactId = useCallback(async ({ contact_id }) => {
    const request = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/hubspot`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        crmid : contact_id,
        Token: token
      })
    });

    return await request.json();

  }, [token]);

  const getDataByDealId = useCallback(async ({ deal_id }) => {
    const request = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/hubspot`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deal_id: deal_id,
        Token: token
      })
    });

    return await request.json();

  }, [token]);

  const getTemplate = useCallback(async ({ hubspot_id }) => {

    const request = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/template`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hubspot_id,
        Token: token
      })
    });

    return await request.json();

  }, [token]);

  const sendOutboundMessage = useCallback(async ({ To, customerName, Body, WorkerFriendlyName, KnownAgentRoutingFlag, OpenChatFlag, hubspot_contact_id }) => {

    const request = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/sendOutboundMessage`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        To,
        Body,
        customerName,
        WorkerFriendlyName,
        KnownAgentRoutingFlag,
        OpenChatFlag,
        hubspot_contact_id,
        Token: token
      })
    });

    return await request.json();

  }, [token]);

  return {
    getDataByContactId,
    getDataByDealId,
    getTemplate,
    sendOutboundMessage
  }
}

export default useApi;