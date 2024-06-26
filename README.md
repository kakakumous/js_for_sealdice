# js_for_sealdice
kakakumous为[海豹骰](https://github.com/sealdice/sealdice-core)编写的JavaScript扩展文件仓库。
私货是打算做文字交互rpg插件集，由于负责剧本的文案同学跑路本项目鬼了> <，现交出通用版本方便大家玩耍，如有问题沟通可在海豹4群捕捉本人私聊，各模块以依赖文件为核心，可分离执行，按需下载。
</br>生活艰难，扫码投喂↓
</br><img src="https://github.com/kakakumous/js_for_sealdice/blob/main/thankU!.JPG" width = 300 height = 300>
## 已完成扩展
**注意：由于商店系统插件中货币的命名发生过改动（金币->金钱），如果想使用旧版本的插件请确保脚本中关于货币的命名是一致的（只需要用vscode或记事本打开查找修改中文即可），所有插件的最新版一律为金钱**
插件低耦合高内聚，可独立工作，依赖仅代表更全的功能和部分代码借用来源。
### 每日抽卡for商店系统（通用版）.js
当前最新版本为1.0.1，私货经历过从豹语转js的迭代和群友三个月每天使用的高强度测试，很可靠，如果出现问题那一定是改通用手滑了的问题请留言/在群里抓我改）））
抽卡获得的奖励不进背包而是以变量形式存在海豹的map中，另有开箱插件可以开启奖励（目前还是私货没有转通用）
与海豹自带功能的联动：jrrp数值影响物品掉率;
与道具使用for商店系统的联动：$m道具好运和$m道具霉运的值影响物品掉率;
在脚本开头可修改每次抽卡消耗的金钱/一口气多次抽卡次数/每日最多抽卡次数等。
#### 可使用指令
- 抽一下//单抽
- 抽十连//十连
- 想看自己的倒霉程度//抽卡数据查询
- 想看一群倒霉蛋//按接入点对水漂次数进行排行
- 想看最倒霉的倒霉蛋//按全体用户对水漂次数进行排行
#### 详细解释 推荐喜欢定制卡池但又不了解代码的骰主查看：
本抽卡插件的掉落物结算顺序为：
  - 1.根据jrrp、$m道具好运和$m道具霉运的值计算运气层数，运气层数对应影响物品掉率（具体对应关系在line326，可更改数值）。
  - 2.脚本自动取0~100随机数，若不大于1中得到的掉率数值则没有打水漂，进入掉落物结算环节，再自动取0~100随机数决定具体掉落（line91~line114,可更改具体掉落及其掉率）。
  - 3.额外的，若连续一无所有天数大于某确定数值，会掉落一个安慰奖（非酋赏，在line124进行配置）。
为了减少依赖，抽卡掉落物以$m形式存于海豹db而不是插件专属db中，便于其他插件和自定义回复利用，若有进包需求可以使用奖励开箱for商店系统让物品进商店系统背包（我确信这不会是套娃.jpg，独立出来的原因主要是抽卡数据统计导致数据库写入频繁，加上道具使用和商店原本的数据会比较难维护商店那边的数据库。且不想绑定用可以独立工作真的很重要（点头））。
### 道具使用for商店系统（通用版）.js
测试阶段，当前最新版本为1.1.2，上一个稳定的版本为1.0.2refine，欢迎在文件下留言反馈问题和bug。
</br>背包功能来自步棋的商店插件，使用的道具需在背包内持有，使用请确保安装依赖。
影响的变量为海豹骰支持的$m和$g型变量，利于与自定义回复的代码块部分进行交互。
#### 依赖文件：海豹_商店插件by[步棋](https://github.com/oissevalt).js
道具使用插件适配原版依赖的v1.0.0/v1.2.2版本。推荐使用v1.2.2版本(修复了v1.0.0中的各种错误)。
#### 新增指令：
- *【旧数据的兼容升级】.升级道具使用 YES//从1.0.x升级到1.1.x，升级前请备份数据库防止发生不可挽回的错误，新安装或1.1.x内更新可无视这条指令
- *【全新的添加信息，最多可带10参数】.添加物品信息 <名称 非空> <类别 非空> <使用次数（一般为整数，符号！为永久 #为不可使用）> <影响变量，例：$m金币+1，多个可用&（同时生效）或|（其一生效）隔开，&优先匹配 不支持括号 支持%表达）> <描述> <使用回执> <损失回执> <获取物品> <使用冷却> <保持时长>（单位：小时）//仅限骰主使用 没带非空意思就是可空，不需要的用#占位即可**获取物品尚未实现仍为todo**
- .删除物品信息 <名称> //仅限骰主使用 **将来也许会有的TODO:删除所有背包中的此物品**
- .物品一览 <类别> <页数>//展示所有道具简要信息，仅限骰主使用 曾用名：展示道具、道具一览 类别为总览时展示所有道具的道具名和序号
- .检索物品信息 <名称> <页数>//检索道具详细信息，仅限骰主使用
- .查看 <名称> //查看背包内已有物品的描述
- .使用 <名称> <数量（为空时默认为1）> <目标（at,为空时默认为自己）>//使用背包内已有物品 
#### 测试用指令（擦屁股专用，不推荐日常使用，涉嫌作弊）：
- .查看属性 <名称（例：$mHP）> <目标（at,为空时默认为自己）>
- .强制获取 <名称> <数量>  <目标（at,为空时默认为自己）>//向目标背包中塞入指定物品，仅限骰主使用
- .强制更改 <名称（例：$mHP）> <数值> <目标（at,为空时默认为自己）> //更改指定变量，仅限骰主使用
#### 详细解释 推荐骰主查看：
  </br>使用冷却是否为0决定了这个道具的使用是否有冷却时间，默认0，非0则代表冷却小时数。
  </br>保持时长是否为0决定了这个道具的使用影响的是状态类变量还是数值类变量，默认0，非零则代表生效小时数。
  </br>**在使用多个相同道具时，数值类变量堆叠数值，状态类变量堆叠持续时间。**
  </br>例：$m金币为数值类变量，若想使用一个金币袋获取10金币，应这样填写金币袋的信息
  ```
  .添加物品信息 小金币袋 道具 1 $m金币+10 一小袋金币。 # 你打开了这个小袋子，获取了10金币。//推荐的格式
  // 非状态类变量可以省略后两个参数 是否限时默认装填的是0(默认为数值类)
  ```
  或者
  ```
  .添加物品信息 小金币袋 道具 1 $m金币+10//这是有效果的道具最简格式 描述和使用回执会被脚本内置的文本默认填充
  //若不希望这个道具被使用，使用次数请用#占位
  ```
  在没有另外定义&初始化的情况下，当是否限时为0时，最大值为$m金币_MAX=-1（意为金币无上限，另外定义最大值请按此格式：变量名_MAX，可通过自定义回复代码块或js脚本操作），在影响变量参数带%表达时使用会被拦截，若不想麻烦请避免使用带%表达。
  </br>若定义了最大值，则可在影响变量参数中使用%表达。
  </br>例：$mHP为数值类变量，已有定义最大值$mHP_MAX=100,若想使用一个HP药水增加血量上限的50%HP，应写为
  ```
  .添加物品信息 HP药水 药剂 1 $mHP+50% 一瓶红色的药水。 # 你喝了下去，伤口开始自动愈合。
  ```
  当然，使用后的HP不会超过最大值，若希望道具使用后的值可以越界，可自行更改脚本中use方法的实现。
  </br>于状态类变量，其中存储的是此状态堆叠的层数，在没有另外定义&初始化的情况下，当是否限时为1时，最大值默认值为7（可更改脚本开头的变量INIT_MAX_STATUS）
  </br>例：$m运气等级为状态类变量，若想使用一个转运符使接下来的运气等级为1并持续12小时（需要按分钟时转写为小数即可），应写为
  ```
  .添加物品信息 转运符 道具 1 $m道具好运=1 神秘的符文，让人感觉一捏就碎。 # 随着一道转瞬即逝的光彩，它无声碎裂了。 # 0 12
  ```
  若有影响这个属性的其它因素（例如已经使用了效果更强的道具且未到时限）导致$m运气等级_upTime大于当前时间，且新的层数小于旧层数，使用会被拦截。
### 网易云点歌(返回cq码音乐卡片).js
（请注意，由于是以音乐卡片形式返回，使用gocq的海豹老用户才能正常使用本插件。新版海豹基于ntqq协议使用的拉格兰等新框架目前暂不支持此功能。）
.网易云 <歌名>//网易云点歌 需要在脚本内维护api的token->其实也能发送指令更新但是懒得做，时间成本上不如手动改
