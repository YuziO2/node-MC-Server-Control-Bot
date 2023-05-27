import tencentcloud from "tencentcloud-sdk-nodejs";
import { tencentCloudConfig } from "../config.js";

const BillingClient = tencentcloud.billing.v20180709.Client;

const clientConfig = {
  credential: tencentCloudConfig.credential,
  region: tencentCloudConfig.region,
  profile: {
    httpProfile: {
      endpoint: "billing.tencentcloudapi.com",
    },
  },
};

export async function describeAccountBalance() {
  const client = new BillingClient(clientConfig);
  const data = await client.DescribeAccountBalance();
  return data.RealBalance;
}

// console.log((await describeAccountBalance()) / 100);
