import tencentcloud from "tencentcloud-sdk-nodejs";
import config from "./config.js";

const BillingClient = tencentcloud.billing.v20180709.Client;

const clientConfig = {
  credential: config.credential,
  region: config.region,
  profile: {
    httpProfile: {
      endpoint: "billing.tencentcloudapi.com",
    },
  },
};

export async function describeAccountBalance() {
  const client = new BillingClient(clientConfig);
  const params = {};
  const data = await client.DescribeAccountBalance(params);
  return data.RealBalance;
}

// console.log((await describeAccountBalance()) / 100);
