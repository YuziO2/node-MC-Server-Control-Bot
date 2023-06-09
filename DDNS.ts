// var axios = require("axios").default;
import axios from "axios";
import { ddnsConfig, generalConfig } from "./config.js";
const { zone_id, auth_email, auth_key } = ddnsConfig;
const { hostName: name } = generalConfig;
let dns_id = "";

export default async function DDNS(ip: string) {
  const getRes = await axios.request({
    method: "GET",
    url: `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records`,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Email": auth_email,
      "X-Auth-Key": auth_key,
    },
  });
  dns_id = getRes.data.result.filter((v: any) => v.name == name)[0].id;

  await axios.request({
    method: "PUT",
    url: `https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${dns_id}`,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Email": auth_email,
      "X-Auth-Key": auth_key,
    },
    data: {
      content: ip,
      name,
      proxied: false,
      type: "A",
      ttl: 1,
    },
  });
}
