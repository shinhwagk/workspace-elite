import { serve } from "https://deno.land/std@0.193.0/http/server.ts";

interface AlertHook {
  version: "4";
  groupKey: string;
  receiver: string;
  status: "resolved" | "firing";
  groupLabels: { [label: string]: string };
  commonLabels: { [label: string]: string };
  commonAnnotations: { [key: string]: string };
  externalURL: string;
  alerts: AlertHookAlert[];
}

interface AlertHookAlertLabels {
  alertname: string;
  [key: string]: string;
}

interface AlertHookAlert {
  status: "resolved" | "firing";
  labels: AlertHookAlertLabels;
  annotations: { [key: string]: string };
  startsAt: string;
  endsAt: string;
  generatorURL: string;
}

type AlertAction = (ah: AlertHook) => Promise<void>;

const _processActions = (ah: AlertHook, actions: AlertAction[]) =>
  actions.forEach((a) => a(ah).catch(console.error));

const handler = (ass: AlertAction[]) => async (request: Request) => {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/webhook") {
    const alertHook: AlertHook = await request.json();
    _processActions(alertHook, ass);
    return new Response();
  } else if (request.method === "GET" && url.pathname === "/ready") {
    return new Response();
  } else {
    return new Response();
  }
};

const consoleAlertHook: AlertAction = (ah: AlertHook) =>
  new Promise((resolve) => {
    console.info(JSON.stringify(ah));
    resolve();
  });

async function httpPost(url: string, body: string) {
  const res = await fetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    },
  );
  console.log(await res.json());
}

const weixinAppWebHook: AlertAction = async (ah: AlertHook) => {
  for (const a of ah.alerts) {
    const body = a.annotations["body"];
    const url = a.annotations["url"];
    await httpPost(url, body);
  }
};

const alertActions: AlertAction[] = [consoleAlertHook, weixinAppWebHook];

const port = 8080;
serve(handler(alertActions), { hostname: "0.0.0.0", port });
console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
