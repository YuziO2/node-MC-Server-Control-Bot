export const tgBotConfig = {
  token: "",
  proxy: "http://127.0.0.1:7890", //需要可填写代理的url地址，不需要可留空
  privilegedGroups: [-1919810],
  privilegedPersons: [123, 456],
};

export const generalConfig = {
  hostName: "example.com",
};

export const ddnsConfig = {
  zone_id: "",
  auth_email: "",
  auth_key: "",
};

export const mcServerConfig = {
  sshUsername: "",
  sshPrivateKeyPath: "/path/to/id_rsa",
  startCommand: "./start.sh", //cwd为serverPath，以"./"开头
  serverPath: "/mcServer", //以数据盘为根目录，"/"开头
};

export const tencentCloudConfig = {
  credential: {
    secretId: "",
    secretKey: "",
  },
  region: "",
  diskId: "",//要挂载的数据盘的ID
  createInstanceParams: {//由腾讯云开通实例界面的“生成最佳启动模板”生成
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
  },
};

// "start": "node --experimental-specifier-resolution=node ./dist/index.js"