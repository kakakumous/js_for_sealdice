// ==UserScript==
// @name         网易云点歌(返回cq码音乐卡片)
// @author       kakakumous
// @version      1.0.0
// @description  基于星尘的点歌插件二改换了api,更新token打开本文件看教程。使用方法：".网易云 <歌名 (作者)>"
// @timestamp    1713891616
// 2024-04-24 01:00:16
// @license      Apache-2
// @homepageURL  https://github.com/kakakumous/js_for_sealdice
// ==/UserScript==
let ext = seal.ext.find("wyymusic");
if (!ext) {
    ext = seal.ext.new("wyymusic", "kakakumous", "1.0.0");
    seal.ext.register(ext);
}
//免责声明：随便搜的api不知道能用多久，家人们有更好的选择可以自己换，这个文件上传之后不会再维护
//更新token教程：进入这个网页https://www.free-api.com/doc/369有个关注公众号，搞到token改下面这个值就行
const token = "LwExDtUWhF3rH5ib";

const cmdCloudMusic = seal.ext.newCmdItemInfo();
  cmdCloudMusic.name = "网易云";
  cmdCloudMusic.help =
    "网易云点歌，可用.网易云 <歌名 (作者)> 作者可以加也可以不加";
  cmdCloudMusic.solve = (ctx, msg, cmdArgs) => {
    let val = cmdArgs.getArgN(1);
    switch (val) {
      case "help": {
        const ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
      }
      default: {
        if (!val) {
          seal.replyToSender(ctx, msg, `要输入歌名啊...`);
        }
        let musicName = val;
        let url =
          "https://v2.alapi.cn/api/music/search?keyword=" + musicName +"&token="+ token;
        fetch(url)
          .then((response) => {
            if (response.ok) {
              return response.text();
            } else {
              console.log(response.status);
              console.log("网易云音乐api失效！");
            }
          })
          .then((data) => {
            let musicJson = JSON.parse(data).data;
            if (musicJson.songCount == 0) {
              seal.replyToSender(ctx, msg, "没找到这首歌");
              return seal.ext.newCmdExecuteResult(true);
            }
            let musicId = musicJson.songs[0].id;
            let messageRet = "[CQ:music,type=163,id=" + musicId + "]";
            seal.replyToSender(ctx, msg, messageRet);
          })
          .catch((error) => {
            console.log("网易云音乐api请求错误！错误原因：" + error);
            console.log(data);
          });
        return seal.ext.newCmdExecuteResult(true);
      }
    }
  };
  ext.cmdMap["网易云"] = cmdCloudMusic;
  seal.ext.register(ext);

