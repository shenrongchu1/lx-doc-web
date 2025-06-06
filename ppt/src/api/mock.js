const getRandom = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min
}

const mockData = {
  noData: null,
  uploadFiles: [
    'https://img0.baidu.com/it/u=1451419006,2097577836&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500',
    'https://img2.baidu.com/it/u=1446701745,1520263386&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=889'
  ],
  getUserInfo: {
    userName: '街角小林',
    account: 'wanglin',
    createAt: '2024-04-29 16:55:55',
    avatar:
      Math.random() > 0.5
        ? ''
        : 'https://img0.baidu.com/it/u=3438909157,109984304&fm=253&fmt=auto&app=138&f=JPEG?w=530&h=500'
  },
  getUserConfig: JSON.stringify({
    previewTheme: 'github',
    codeTheme: 'github'
  }),
  getFileContent: {
    id: '123',
    name: '我的ppt文件',
    content: ''
  }
}

const getMockData = (api, ...args) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(api, ...args)
      if (typeof mockData[api] === 'function') {
        resolve({
          code: 0,
          message: 'success',
          data: mockData[api](...args)
        })
      } else if (mockData[api] !== undefined) {
        resolve({
          code: 0,
          message: 'success',
          data: mockData[api]
        })
      } else {
        resolve({
          code: 0,
          message: 'success',
          data: mockData.noData
        })
      }
      // reject({
      //   code: -1,
      //   message: 'fail',
      //   data: null
      // })
    }, 200)
  })
}

export default getMockData
