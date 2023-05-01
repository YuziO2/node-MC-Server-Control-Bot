import tencentcloud from "tencentcloud-sdk-nodejs";
import config from "./config.js";

const CvmClient = tencentcloud.cvm.v20170312.Client;
const clientConfig = {
  credential: config.credential,
  region: config.region,
  profile: {
    httpProfile: {
      endpoint: "cvm.tencentcloudapi.com",
    },
  },
};

export async function describeInstances(InstanceId) {
  const client = new CvmClient(clientConfig);
  const params = {
    InstanceIds: [InstanceId],
  };
  return await client.DescribeInstances(params);
}

//创建实例，返回字符串，是实例ID
export async function createInstance() {
  const client = new CvmClient(clientConfig);
  //↓此段在腾讯云选好配置准备结算时可选择“生成启动脚本”来生成，无需手动填写
  const params = {
    InstanceChargeType: "SPOTPAID",
    Placement: {
      Zone: "",
      ProjectId: 0,
    },
    InstanceType: "C5.LARGE8",
    ImageId: "",
    SystemDisk: {
      DiskType: "CLOUD_PREMIUM",
      DiskSize: 30,
    },
    VirtualPrivateCloud: {
      VpcId: "",
      SubnetId: "",
      AsVpcGateway: false,
      Ipv6AddressCount: 0,
    },
    InternetAccessible: {
      InternetChargeType: "TRAFFIC_POSTPAID_BY_HOUR",
      InternetMaxBandwidthOut: 10,
      PublicIpAssigned: true,
    },
    InstanceCount: 1,
    InstanceName: "",
    LoginSettings: {
      KeyIds: [],
    },
    SecurityGroupIds: [],
    EnhancedService: {
      SecurityService: {
        Enabled: true,
      },
      MonitorService: {
        Enabled: true,
      },
      AutomationService: {
        Enabled: true,
      },
    },
    InstanceMarketOptions: {
      SpotOptions: {
        MaxPrice: "1000",
      },
    },
    DisableApiTermination: false,
  };
  //↑生成部分
  const data = await client.RunInstances(params);
  return data.InstanceIdSet[0];
}

export async function destroyInstances(InstanceId) {
  const client = new CvmClient(clientConfig);
  const params = {
    InstanceIds: [InstanceId],
  };
  return await client.TerminateInstances(params);
}
