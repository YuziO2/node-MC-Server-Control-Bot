import tencentcloud from "tencentcloud-sdk-nodejs";
import { tencentCloudConfig } from "../config.js";

const CvmClient = tencentcloud.cvm.v20170312.Client;
const clientConfig = {
  credential: tencentCloudConfig.credential,
  region: tencentCloudConfig.region,
  profile: {
    httpProfile: {
      endpoint: "cvm.tencentcloudapi.com",
    },
  },
};

export async function describeInstances(InstanceId: string) {
  const client = new CvmClient(clientConfig);
  const params = {
    InstanceIds: [InstanceId],
  };
  return await client.DescribeInstances(params);
}

//创建实例，返回字符串，是实例ID
export async function createInstance() {
  const client = new CvmClient(clientConfig);
  const params = tencentCloudConfig.createInstanceParams;

  const data = await client.RunInstances(params);
  return data.InstanceIdSet?.[0];
}

export async function destroyInstances(InstanceId: string) {
  const client = new CvmClient(clientConfig);
  const params = {
    InstanceIds: [InstanceId],
  };
  return await client.TerminateInstances(params);
}
