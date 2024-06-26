// ==UserScript==
// @name         奖励开箱for商店系统
// @author       kakakumous
// @version      1.0.1
// @description  消耗$m变量转变为背包物品，至少需要骰主【添加奖励箱】创建奖励箱再【添加奖励内容】才能正常使用。骰主指令：添加奖励箱|删除奖励箱|检索奖励箱|奖励箱一览|添加奖励内容，普通指令：开启奖励箱|我的可开启奖励箱。
// @timestamp    1692700722
// 2023-08-22 18:38:42
// @license      CC-BY-NC-SA 4.0
// @homepageURL  https://github.com/kakakumous/js_for_sealdice
// ==/UserScript==

let ext = seal.ext.find("shop");
if (!ext) {
    ext = seal.ext.new("shop", "檀轶步棋", "1.0.0");
    seal.ext.register(ext);
}

const ITEMS_PER_PAGE=10;//在此定义骰主.展示奖励箱时每页展示的物品数
const BASIC_BACKPACK_MAXITEMS=50;//基础背包格数 跟随Rucksack
const ITEM_MAX_NUM=999;//最大堆叠数量 跟随Rucksack
const ONCE_OPEN_MAX=10;//一次性开启的最大战利品数

class Trophy {
    trophy;
    constructor() {
        this.trophy=JSON.parse(ext.storageGet("trophy") || "[]");
    }
    save() {
        ext.storageSet("trophy", JSON.stringify(this.trophy));
    }
    getOverview(name) {
        for (let [i, v] of this.trophy.entries()) {
            if (v.name === name) {
                return v;
            }
        }
        return null;
    }
    newTrophy(item) {
        this.trophy.push(item);
        this.save();
    }
    updateTrophy(item) {
        for (let [i, v] of this.trophy.entries()) {
            if (v.name == item.name) {
                this.trophy[i].discreption = item.discreption;
                this.trophy[i].openMsg = item.openMsg;
                this.save();
                return;
            }
        }
    }
    deleteTrophy(name) {
        for (let [i, v] of this.trophy.entries()) {
            if (v.name === name) {
                this.trophy.splice(i,1);
                this.save();
                return;
            }
        }
    }
    placeInclude(name, include) {
        for (let [i, v] of this.trophy.entries()) {
            if (v.name == name) {
                this.trophy[i].includes.push(include);
                this.save();
                return true;
            }
        }
        return false;//没有这个奖励箱子
    }
    removeInclude(name, include) {
        for (let [i, v] of this.trophy.entries()) {
            if (v.name == name) {
                for(let j=0;j<this.trophy[i].includes.length;j++){
                    if(this.trophy[i].includes[j].include_item == include.include_item){
                        this.trophy[i].includes.splice(j,1);
                        this.save();
                        return 0;
                    }
                }
                return 2;//没有这一条内容物
            }
        }
        return 1;//没有这个奖励箱子
    }
    present(page) {
        if (this.trophy.length <= 0) {
            return "还没有任何奖励箱信息";
        }
        if(this.trophy.length<(page-1)*ITEMS_PER_PAGE-1){
            return "这一页没有奖励箱信息";
        }
        let arr = [];
        for (let i = (page-1)*ITEMS_PER_PAGE ; i < page*ITEMS_PER_PAGE ; i++) {
            if(this.trophy[i] === undefined){
                break;
            }
            console.log(this.trophy[i].name);
            let str=`~ ${this.trophy[i].name}:${this.trophy[i].discreption}\n开启时以【${this.trophy[i].openMsg}】开头`;
            arr.push(str);
        }
        return arr.join("\n");
    }
    presentAll() {
        if (this.trophy.length <= 0) {
            return false;
        }
        let arr = [];
        for (let i=0;i<this.trophy.length;i++) {
            if(this.trophy[i] === undefined){
                break;
            }
            arr.push(this.trophy[i].name);
        }
        return arr;
    }
}
class Rucksack {
    items;
    size;
    userId;
    ctx;
    money;
    crystal;
    constructor(ctx) {
        let itemAll = JSON.parse(ext.storageGet("backpacks") || "{}");
        this.userId = ctx.player.userId;
        this.ctx = ctx;
        this.size = BASIC_BACKPACK_MAXITEMS + seal.vars.intGet(ctx, `$m额外背包位`)[0];
        this.items = itemAll[this.userId] ? itemAll[this.userId]["backpack"] : [];
        this.money = seal.vars.intGet(ctx, `$m金钱`)[0];
    }
    save() {
        let itemAll = JSON.parse(ext.storageGet("backpacks") || "{}");
        if (!itemAll[this.userId]) {
            itemAll[this.userId] = {};
        }
        itemAll[this.userId]["backpack"] = this.items;
        itemAll[this.userId]["money"] = this.money;
        seal.vars.intSet(this.ctx, "$m金钱", this.money);
        ext.storageSet("backpacks", JSON.stringify(itemAll));
    }
    sameValue(){//同步个人变量中影响背包的变量
        this.size =BASIC_BACKPACK_MAXITEMS + seal.vars.intGet(this.ctx, `$m额外背包位`)[0];
        this.money = seal.vars.intGet(this.ctx, `$m金钱`)[0];
    }
    getOverview(name) {
        for (let [i, v] of this.items.entries()) {
            if (v.name === name) {
                return v;
            }
        }
        return null;
    }
    placeItem(item) {
        for (let [i, v] of this.items.entries()) {
            if (v.name === item.name) {
                if(this.items[i].quantity + item.quantity>ITEM_MAX_NUM){return 2;}
                console.log(this.items[i].quantity+`+`+item.quantity);
                this.items[i].quantity +=item.quantity;
                this.save();
                return 0;
            }
        }
        if(this.items.length>=this.size){return 1;}
        this.items.push(item);
        this.save();
        return 0;
    }
    removeItem(name, quantity = 1) {
        for (let [i, v] of this.items.entries()) {
            if (v.name === name) {
                if (quantity >= v.quantity) {
                    this.items.splice(i,1);
                }
                else {
                    this.items[i].quantity -= quantity;
                }
                this.save();
                return;
            }
        }
    }
    deleteItem(name) {
        for (let [i, v] of this.items.entries()) {
            if (v.name === name) {
                this.items.splice(i,1);
                this.save();
                return;
            }
        }
    }
    open(trophy, trophyName, questQuantity){
        let trophyOverview = trophy.getOverview(trophyName);
        let trophyNums = seal.vars.intGet(this.ctx, `$m`+trophyName)[0];
        //数据库检测
        if(!trophyOverview){
            return `开启失败。${trophyName}不是可以被开启的奖励。`;
        }
        //数量检测+最大值拦截
        if(trophyNums<=0){
            return `开启失败。你持有的${trophyName}数为0。`;
        }
        let openQuantity = questQuantity;
        if(openQuantity==-1){
            openQuantity=trophyNums;
        }
        if(openQuantity>trophyNums){
            return `开启失败。你持有的${trophyName}为${trophyNums}个，不足以开启${questQuantity}个。`;
        }
        if(openQuantity>ONCE_OPEN_MAX){
            openQuantity = ONCE_OPEN_MAX;
        }
        //空箱检测 TODO分支：抽牌堆 感觉有点麻烦以后再说
        if(trophyOverview.includes.length==0){
            return `怎会如此！这个奖励目前是空的，你什么都抽不到啊！（开启失败）`;
        }
        //开启箱子
        let openMsg = trophyOverview.openMsg;
        let max=trophyOverview.includes.length-1;
        for(let i=0;i<openQuantity;i++){//循环塞包
            let choosenIncude = getRandomInt(0,max);
            let name = trophyOverview.includes[choosenIncude].include_item;
            let quantity = parseInt(trophyOverview.includes[choosenIncude].include_quantity);
            openMsg=openMsg+`\n${name}*${quantity}`;
            let res=this.placeItem({name, quantity});
            if(res!=0){
                if(res==1)return openMsg+`\n背包已满，不能开下去了！`;
                if(res==2)return openMsg+`\n你不能再获得更多的${name}，不能开下去了！`;
                break;
            }
            trophyNums=trophyNums-1;
        }
        seal.vars.intSet(this.ctx, `$m`+trophyName, trophyNums);
        return openMsg;
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
//=======================================================================================骰主对奖励信息的操作
let cmdAddTrophy = seal.ext.newCmdItemInfo();
cmdAddTrophy.name = "AddTrophy";
cmdAddTrophy.help = ".添加奖励箱 <名称（内置包含$m，即要配置$m一等赏作为奖励箱只需要填入一等赏这三个字）> <描述> <开启回执>//仅限骰主使用，重复添加即更新信息。";
cmdAddTrophy.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    let name = args.getArgN(1);
    let discreption = args.getArgN(2)||`神秘的箱子，不知道能开出什么。`;
    let openMsg=args.getArgN(3)||`pong！你获得了：`;

    let includes=[];

    console.log(`~ ${name}\n描述: ${discreption}\n使用回执: ${openMsg}\n`);
    if (!name) {
        seal.replyToSender(ctx, msg, "请至少填入要添加的奖励箱名。");
        return seal.ext.newCmdExecuteResult(true);
    }
    let trophy = new Trophy();
    if(trophy.getOverview(name)){
        trophy.updateTrophy({ name, discreption, openMsg, includes});
    }else{
        trophy.newTrophy({ name, discreption, openMsg, includes});
    }
        seal.replyToSender(ctx, msg, `已添加${name}`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["添加奖励箱"] = cmdAddTrophy;

let cmddelTrophy = seal.ext.newCmdItemInfo();
cmddelTrophy.name = "delTrophy";
cmddelTrophy.help = ".删除奖励箱 <名称> //仅限骰主使用";
cmddelTrophy.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    let name = args.getArgN(1);
    if (!name) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.删除奖励箱 <名称>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let trophy = new Trophy();
    trophy.deleteTrophy(name);
    seal.replyToSender(ctx, msg, `执行成功，若奖励箱数据库中存在该奖励箱则会被删除`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["删除奖励箱"] = cmddelTrophy;

let cmdlistTrophy = seal.ext.newCmdItemInfo();
cmdlistTrophy.name = "listTrophy";
cmdlistTrophy.help = ".奖励箱一览 <页数（需大于0，为空默认为1）> //仅限骰主使用 按页数查询";
cmdlistTrophy.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    let page = parseInt(args.getArgN(1))||1;
    if (isNaN(page)) {
        seal.replyToSender(ctx, msg, "参数错误。页数应该是个数字。");
        return seal.ext.newCmdExecuteResult(true);
    }
    if (page<=0) {
        seal.replyToSender(ctx, msg, "参数错误，页数应>0");
        return seal.ext.newCmdExecuteResult(true);
    }

    let trophy = new Trophy();
    let allTrophy = trophy.present(page);

    seal.replyToSender(ctx, msg, `奖励箱<`+page+`>：\n${allTrophy}\n查看奖励箱内容物请.检索奖励箱 <名称>`);

    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["奖励箱一览"] = cmdlistTrophy;

let cmdAddTrophyInclude = seal.ext.newCmdItemInfo();
cmdAddTrophyInclude.name = "AddTrophyInclude";
cmdAddTrophyInclude.help = ".添加奖励内容 <奖励箱名称> <物品> <数量>//仅限骰主使用，按条添加";
cmdAddTrophyInclude.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    let name = args.getArgN(1);
    let include_item=args.getArgN(2);
    let include_quantity = args.getArgN(3)||1;

    console.log(`~ ${name}\n添加奖励内容: ${include_item}*${include_quantity}`);
    if (!name||!include_item) {
        seal.replyToSender(ctx, msg, "参数错误。.添加奖励内容 <奖励箱名称> <物品> <数量>//仅限骰主使用");
        return seal.ext.newCmdExecuteResult(true);
    }
    let trophy = new Trophy();
    if(trophy.placeInclude(name,{include_item,include_quantity})){
        seal.replyToSender(ctx, msg, `在${name}中添加了一条奖励：${include_quantity}个${include_item}`);
    }else{
        seal.replyToSender(ctx, msg, `${name}尚未创建`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["添加奖励内容"] = cmdAddTrophyInclude;

let cmdsearchTrophy = seal.ext.newCmdItemInfo();
cmdsearchTrophy.name = "searchTrophy";
cmdsearchTrophy.help = ".检索奖励箱 <名称> //仅限骰主使用";
cmdsearchTrophy.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    let name = args.getArgN(1);
    if (!name) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.检索奖励箱 <名称>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let trophy = new Trophy();
    let trophyOverview = trophy.getOverview(name);
    if(trophyOverview!=null){
        let arr=[];
        arr.push(`${trophyOverview.name}:${trophyOverview.discreption}\n开启时以【${trophyOverview.openMsg}】开头。\n内部掉落一览：`); 
        for (let [i, v] of trophyOverview.includes.entries()) {
            arr.push(v.include_item+`*`+v.include_quantity);
        }
        seal.replyToSender(ctx, msg, arr.join("\n"));
    }else{
        seal.replyToSender(ctx, msg, `数据中目前里没有这个奖励箱。`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["检索奖励箱"] = cmdsearchTrophy;

//===============================================================================所有人都可以用的指令
let cmdopenTrophy = seal.ext.newCmdItemInfo();
cmdopenTrophy.name = "openTrophy";
cmdopenTrophy.help = ".开启奖励箱 <名称> <数量>";
cmdopenTrophy.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let trophyName = args.getArgN(1);
    let questQuantity = -1;
    if(!isNaN(args.getArgN(2))){
        questQuantity = parseInt(args.getArgN(2))||-1;
    }

    if (!trophyName || questQuantity<=0&&questQuantity!=-1) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.开启奖励 <名称> <数量>");
        return seal.ext.newCmdExecuteResult(true);
    }

    let trophy = new Trophy();
    let backpack = new Rucksack(ctx);
    let res=backpack.open(trophy, trophyName, questQuantity);
    seal.replyToSender(ctx, msg, res);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["开启奖励箱"] = cmdopenTrophy;

let cmdshowMyTrophy = seal.ext.newCmdItemInfo();
cmdshowMyTrophy.name = "showMyTrophy";
cmdshowMyTrophy.help = ".我的可开启奖励箱";
cmdshowMyTrophy.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let trophy = new Trophy();
    let allTrophy = trophy.presentAll();
    let res=[];
    if(!allTrophy){
        seal.replyToSender(ctx, msg, `目前骰主没有配置任何可开启的奖励箱。`);
        return seal.ext.newCmdExecuteResult(true);
    }
    for(i=0;i<allTrophy.length;i++){
        let trophyNums = seal.vars.intGet( ctx, `$m`+allTrophy[i])[0];
        if(trophyNums>0){
            res.push(`${trophyNums}个${allTrophy[i]}`);
        }
    }
    if(res.length == 0){
        seal.replyToSender(ctx, msg, `你没有可开启的奖励箱。`);
    }else{
        seal.replyToSender(ctx, msg, `你有：\n`+res.join("|"));
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["我的可开启奖励箱"] = cmdshowMyTrophy;