// ==UserScript==
// @name         道具使用for商店系统AS
// @author       kakakumous
// @version      1.0.2
// @description  ASTRA-道具使用（ItemInfo&Rucksack）
// @timestamp    1692412501
// 2023-08-19 10:35:01
// @license      MIT
// @homepageURL  https://github.com/kakakumous/js_for_sealdice
// ==/UserScript==

let ext = seal.ext.find("Astra_backpack");
if (!ext) {
    ext = seal.ext.new("Astra_backpack", "kakakumous", "1.0.0");
    seal.ext.register(ext);
}
//在此定义骰主.展示道具时每页展示的道具数
const ITEMS_PER_PAGE=7;
//在此定义限时buff的最大堆叠层数
const INIT_MAX_STATUS=7;

const BASIC_BACKPACK_MAXITEMS=49;//基础背包格数 跟随Rucksack
const ITEM_MAX_NUM=777;//最大堆叠数量 跟随Rucksack

const UseErrno = {
    1: "背包中无此物品",
    2: "背包中此物品数量不足",
    3: "此物品尚未实装omo",
    4: "啊哦 实装的effect出了点问题 请敲打策划",
    5: "冥冥中一种神奇的直觉让你放弃了使用（有更强力的效果无法覆盖）",
    6: "这个物品不能被使用",
    7: "这个物品使用需定义影响变量的最大值"
};
class ItemInfo {
    itemInfo;
    constructor() {
        this.itemInfo=JSON.parse(ext.storageGet("items") || "[]");
    }
    save() {
        ext.storageSet("items", JSON.stringify(this.itemInfo));
    }
    getOverview(name) {
        for (let [i, v] of this.itemInfo.entries()) {
            if (v.name === name) {
                return v;
            }
        }
        return null;
    }
    placeItem(item) {
        for (let [i, v] of this.itemInfo.entries()) {
            if (v.name == item.name) {
                this.itemInfo[i].discreption = item.discreption;
                this.itemInfo[i].useMsg = item.useMsg;
                this.itemInfo[i].effectType = item.effectType;
                this.itemInfo[i].effect = item.effect;
                this.itemInfo[i].ifStatus = item.ifStatus;
                this.itemInfo[i].upTime = item.upTime;
                this.save();
                return;
            }
        }
        this.itemInfo.push(item);
        this.save();
    }
    deleteItem(name) {
        for (let [i, v] of this.itemInfo.entries()) {
            if (v.name === name) {
                this.itemInfo.splice(i,1);
                this.save();
                return;
            }
        }
    }
    present(page) {
        if (this.itemInfo.length <= 0) {
            return "还没有任何道具信息";
        }
        if(this.itemInfo.length<(page-1)*ITEMS_PER_PAGE-1){
            return "这一页没有道具信息";
        }
        let arr = [];
        for (let i = (page-1)*ITEMS_PER_PAGE ; i < page*ITEMS_PER_PAGE ; i++) {
            if(this.itemInfo[i] === undefined){
                break;
            }
            console.log(this.itemInfo[i].name);
            let str=`~ ${this.itemInfo[i].name}-影响变量: ${this.itemInfo[i].effectType}${this.itemInfo[i].effect}`;
            if(this.itemInfo[i].ifStatus==1)str=str+`持续${this.itemInfo[i].upTime}小时`;
            arr.push(str);
        }
        return arr.join("\n");
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
        this.money = seal.vars.intGet(ctx, `$m月光币`)[0];
        this.crystal = seal.vars.intGet(ctx, `$m魔力水晶`)[0];
    }
    save() {
        let itemAll = JSON.parse(ext.storageGet("backpacks") || "{}");
        if (!itemAll[this.userId]) {
            itemAll[this.userId] = {};
        }
        itemAll[this.userId]["backpack"] = this.items;
        itemAll[this.userId]["money"] = this.money;
        itemAll[this.userId]["crystal"] = this.crystal;
        seal.vars.intSet(this.ctx, "$m月光币", this.money);
        seal.vars.intSet(this.ctx, "$m魔力水晶", this.crystal);
        ext.storageSet("backpacks", JSON.stringify(itemAll));
    }
    sameValue(){//同步个人变量中影响背包的变量
        
        this.size =BASIC_BACKPACK_MAXITEMS + seal.vars.intGet(this.ctx, `$m额外背包位`)[0];
        this.money = seal.vars.intGet(this.ctx, `$m月光币`)[0];
        this.crystal =seal.vars.intGet(this.ctx, `$m魔力水晶`)[0];
        
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
                if(this.items[i].quantity + item.quantity>ITEM_MAX_NUM){return 7;}
                this.items[i].quantity += item.quantity;
                this.save();
                return 0;
            }
        }
        if(this.items.length>=this.size){return 6;}
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
    use(itemInfo, name, quantity, mctx){
        let sackOverview=this.getOverview(name);
        let itemOverview=itemInfo.getOverview(name);
        if(!sackOverview){
            return 1;
        }else if(sackOverview.quantity<quantity){
            return 2;
        }else if(!itemOverview){
            return 3;
        }
        if(itemOverview.effectType===`#`){
            return 6;
        }

        let effectType=itemOverview.effectType;
        let effect=itemOverview.effect;
        //初始化没有的变量=0
        if(seal.vars.intGet(mctx, effectType)[1]==false){
            seal.vars.intSet(mctx, effectType,0);
        }
        let old_effect=seal.vars.intGet(mctx, effectType)[0];
        let new_effect=old_effect;

        if(itemOverview.ifStatus==0){//非状态道具 多用叠数值
            //初始化没有的最大值=-1（无上限）
            if(seal.vars.intGet(mctx, effectType+`_MAX`)[1]==false){
                seal.vars.intSet(mctx, effectType+`_MAX`,-1);
            }
            let effect_MAX=seal.vars.intGet(mctx, effectType+`_MAX`)[0];

            const opType=effect.charAt(0);
            let num = 0;
            if(effect.endsWith(`%`)){
                if(effect_MAX==-1){return 7;}
                num=0.01*effect_MAX*parseFloat(effect.slice(1,effect.length-1));
            }else{
                num=parseFloat(effect.slice(1,effect.length));
            }
            console.log(num);
            switch(opType){
                case `=`:new_effect=num;break;
                case `+`:new_effect=old_effect+num*quantity;break;
                case `-`:new_effect=old_effect-num*quantity;break;
                case `*`:new_effect=old_effect*Math.pow(num,quantity);break;
                default:return 4;
            }
            if(effect_MAX!=-1&&effect_MAX<new_effect){
                seal.vars.intSet(mctx, effectType,effect_MAX);
            }else{
                seal.vars.intSet(mctx, effectType,new_effect);
            }
            console.log(effectType+`=`+seal.vars.intGet(mctx, effectType)[0]);
        }else{//状态道具 多用叠时间
            const timestamp = Date.parse(new Date())/1000;//10位 秒级时间戳

            let upHours=itemOverview.upTime*quantity;
            //初始化没有的最大值=7(限时效果最多堆叠7层)
            if(seal.vars.intGet(mctx, effectType+`_MAX`)[1]==false){
                seal.vars.intSet(mctx, effectType+`_MAX`,INIT_MAX_STATUS);
            }        
            if(seal.vars.intGet(mctx, effectType+`_upTime`)[1]==false){
                seal.vars.intSet(mctx, effectType+`_upTime`,timestamp);
            }

            let effect_MAX=seal.vars.intGet(mctx, effectType+`_MAX`)[0];
            const opType=effect.charAt(0);
            let num = 0;
            if(effect.endsWith(`%`)){
                num=0.01*effect_MAX*parseFloat(effect.slice(1,effect.length-1));
            }else{
                num=parseFloat(effect.slice(1,effect.length));
            }
            console.log(num);

            switch(opType){
                case `=`:new_effect=num;break;
                case `+`:new_effect=old_effect+num;break;
                case `-`:new_effect=old_effect-num;break;
                case `*`:new_effect=old_effect*num;break;
                default:return 4;
            }
            if(old_effect>new_effect&&seal.vars.intGet(mctx, effectType+`_upTime`)[0]>timestamp){
                return 5;//有未到时间限制的更强力效果 无法覆盖
            }
            if(effect_MAX!=-1&&effect_MAX<new_effect){
                seal.vars.intSet(mctx, effectType,effect_MAX);
            }else{
                seal.vars.intSet(mctx, effectType,new_effect);
            }
            console.log(old_effect+`->`+new_effect);
            console.log(effectType+`=`+seal.vars.intGet(mctx, effectType)[0]);
            seal.vars.intSet(mctx, effectType+`_upTime`,timestamp+upHours*3600);
        }
        this.sameValue();
        this.removeItem(name, quantity);
        return 0;
    }
}
//=======================================================================================骰主对道具信息的操作
let cmdAddItemInfo = seal.ext.newCmdItemInfo();
cmdAddItemInfo.name = "AddItemInfo";
cmdAddItemInfo.help = ".添加道具信息 <名称> <影响变量（例：$m金币，若为不可使用道具，填写#）> <影响变量参数（=+-*操作符开头，例：+1即为金币+1，在提前定义了最大值的情况下支持%表达）> <描述> <使用回执> <是否限时（1是0否）> <保持时长(小时 限时为1时需>0)>//仅限骰主使用";
cmdAddItemInfo.solve = (ctx, msg, args) => {
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
    let effectType = args.getArgN(2);
    let effect = args.getArgN(3);
    let discreption = args.getArgN(4)||`你也看不太出来这到底是什么东西。`;
    let useMsg=args.getArgN(5)||`已使用`+name;
    let ifStatus = parseInt(args.getArgN(6))||0;
    let upTime = parseInt(args.getArgN(7))||0;

    console.log(`~ ${name}\n描述: ${discreption}\n使用回执: ${useMsg}\n影响变量: ${effectType}:${effect}\n是否限时状态：${ifStatus}保持时长：${upTime}`);
    if (!name || isNaN(ifStatus) || isNaN(upTime)) {
        seal.replyToSender(ctx, msg, "参数错误。参考：.添加道具信息 <名称> <影响变量（例：$m金币，若为不可使用道具，填写#）> <影响变量参数（=+-*操作符开头）> <描述> <使用回执> <是否限时（1是0否）> <保持时长(小时 限时为1时需>0)\n最后两个参数不填默认为非状态变更道具");
        return seal.ext.newCmdExecuteResult(true);
    }
    if(ifStatus==1&&upTime<=0){
        seal.replyToSender(ctx, msg, `参数错误。道具的维持时间应该>0`);
        return seal.ext.newCmdExecuteResult(true);
    }
    let itemInfo = new ItemInfo();
    itemInfo.placeItem({ name, effectType, effect, discreption, useMsg, ifStatus, upTime});
    if(ifStatus==0){
        seal.replyToSender(ctx, msg, `已添加${name},使用后使${effectType}${effect}`);
    }else{
        seal.replyToSender(ctx, msg, `已添加${name},使用后使${effectType}${effect}，持续${upTime}小时`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["添加道具信息"] = cmdAddItemInfo;

let cmddelItemInfo = seal.ext.newCmdItemInfo();
cmddelItemInfo.name = "delItemInfo";
cmddelItemInfo.help = ".删除道具信息 <名称> //删除道具信息，仅限骰主使用 TODO:删除所有背包中的此物品（谨慎操作）";
cmddelItemInfo.solve = (ctx, msg, args) => {
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
        seal.replyToSender(ctx, msg, "参数错误。用法：.删除道具信息 <名称>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let itemInfo = new ItemInfo();
    itemInfo.deleteItem(name);
    seal.replyToSender(ctx, msg, `执行成功，若道具信息数据库中存在该道具则会被删除`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["删除道具信息"] = cmddelItemInfo;

let cmdlistItemInfo = seal.ext.newCmdItemInfo();
cmdlistItemInfo.name = "listItemInfo";
cmdlistItemInfo.help = ".道具一览 <页数（为空默认为1）> //仅限骰主使用 按页数查询";
cmdlistItemInfo.solve = (ctx, msg, args) => {
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

    if (page<=0) {
        seal.replyToSender(ctx, msg, "页数应>0");
        return seal.ext.newCmdExecuteResult(true);
    }

    let itemInfo = new ItemInfo();
    let items = itemInfo.present(page);

    seal.replyToSender(ctx, msg, `道具一览<`+page+`>：\n${items}\n查看道具全部信息请.检索道具信息 <名称>`);

    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["道具一览"] = cmdlistItemInfo;

let cmdsearchItemInfo = seal.ext.newCmdItemInfo();
cmdsearchItemInfo.name = "searchItemInfo";
cmdsearchItemInfo.help = ".检索道具信息 <名称> //检索道具信息，仅限骰主使用";
cmdsearchItemInfo.solve = (ctx, msg, args) => {
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
        seal.replyToSender(ctx, msg, "参数错误。用法：.检索道具信息 <名称>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let itemInfo = new ItemInfo();
    let item = itemInfo.getOverview(name);
    if(item!=null){
        if(item.ifStatus==0){
            seal.replyToSender(ctx, msg, `${item.name}\n${item.discreption}\n使用后显示${item.useMsg}\n使${item.effectType}${item.effect}`);
        }else{
            seal.replyToSender(ctx, msg, `${item.name}\n${item.discreption}\n使用后显示${item.useMsg}\n使${item.effectType}${item.effect}，持续${item.upTime}小时`);
        }
    }else{
        seal.replyToSender(ctx, msg, `数据中目前里没有这个道具。`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["检索道具信息"] = cmdsearchItemInfo;
//=======================================================================================================所有玩家可用的指令
let cmdcheckItem = seal.ext.newCmdItemInfo();
cmdcheckItem.name = "checkItem";
cmdcheckItem.help = ".查看 <名称> //查看背包内已有物品的描述";
cmdcheckItem.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    if (!name) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.查看 <名称>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let itemInfo = new ItemInfo();
    let backpack = new Rucksack(ctx);
    let itemOverview = itemInfo.getOverview(name);
    let sackOverview = backpack.getOverview(name);
    let checkMsg = "";
    if (!itemOverview) {
        checkMsg = `这个物品尚未实装，请等待后续更新OMO`;
    }
    else {
        checkMsg = itemOverview.discreption;
    }
    if(!sackOverview){
        checkMsg = `你的背包里没有这个物品`; 
    }
    seal.replyToSender(ctx, msg, checkMsg);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["查看"] = cmdcheckItem;

let cmduseItem = seal.ext.newCmdItemInfo();
cmduseItem.name = "useItem";
cmduseItem.help = ".使用 <名称> <数量>//使用背包内已有物品";
cmduseItem.allowDelegate = true;
cmduseItem.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    let quantity = 1;
    if(!isNaN(args.getArgN(2))){
        quantity = parseInt(args.getArgN(2))||1;
    }

    const mctx = seal.getCtxProxyFirst(ctx, args)||ctx;
    console.log(`道具生效于：`+mctx.player.userId);

    if (!name || quantity<=0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.使用 <名称> <数量(大于0)> <目标（at） 为空则指自己>");
        return seal.ext.newCmdExecuteResult(true);
    }

    let itemInfo = new ItemInfo();
    let backpack = new Rucksack(ctx);
    let itemOverview = itemInfo.getOverview(name);
    let retNum = backpack.use(itemInfo, name, quantity, mctx);
    if (retNum != 0) {
        seal.replyToSender(ctx, msg, `使用失败：${UseErrno[retNum]}`);
    }
    else {
        seal.replyToSender(ctx, msg, itemOverview.useMsg);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["使用"] = cmduseItem;

//=======================================================================================查错用指令 不出问题的情况下不推荐使用
let cmdcheckValue = seal.ext.newCmdItemInfo();
cmdcheckValue.name = "updateValue";
cmdcheckValue.help = ".查看属性 <名称（例：$mHP）> <目标（at,为空则默认为自己）>//查看属性";
cmdcheckValue.allowDelegate = true;
cmdcheckValue.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    const mctx = seal.getCtxProxyFirst(ctx, args)||ctx;
        if (!name) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.查看属性 <名称> <目标（at,为空则默认为自己）>");
        return seal.ext.newCmdExecuteResult(true);
    }
    try {
        seal.replyToSender(ctx, msg,`${mctx.player.name}的${name.slice(2,name.length)}值为：`+seal.vars.intGet(mctx, name)[0]);
    } catch (error) {
        seal.replyToSender(ctx, msg, `没有找到这条属性喵。`);//不触发 找不到都返回0
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["查看属性"] = cmdcheckValue;

let cmdgetItem = seal.ext.newCmdItemInfo();
cmdgetItem.name = "getItem";
cmdgetItem.help = ".强制获取 <名称> <数量>  <目标（at） 为空则指自己>//仅限骰主使用";
cmdgetItem.allowDelegate = true;
cmdgetItem.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    let quantity = 1;
    if(!isNaN(args.getArgN(2))){
        quantity = parseInt(args.getArgN(2))||1;
    }

    const mctx = seal.getCtxProxyFirst(ctx, args)||ctx;
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    if (!name || quantity<=0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.强制获取 <名称> <数量> <目标（at） 为空则指自己>");
        return seal.ext.newCmdExecuteResult(true);
    }

    let backpack = new Rucksack(mctx);
    backpack.sameValue(ctx);
    backpack.placeItem({name, quantity});
    seal.replyToSender(ctx, msg, `强制向${mctx.player.name}的背包里塞了${quantity}个${name}`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["强制获取"] = cmdgetItem;

let cmdupdateValue = seal.ext.newCmdItemInfo();
cmdupdateValue.name = "updateValue";
cmdupdateValue.help = ".强制更改 <名称（例：$mHP）> <数值> <目标（at,为空则默认为自己）>//更改属性";
cmdupdateValue.allowDelegate = true;
cmdupdateValue.solve = (ctx, msg, args) => {
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
    let value = 0;
    if(!isNaN(args.getArgN(2))){
        value = parseInt(args.getArgN(2))||0;
    }    
    const mctx = seal.getCtxProxyFirst(ctx, args)||ctx;
        if (!name) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.查看属性 <名称> <目标（at,为空则默认为自己）>");
        return seal.ext.newCmdExecuteResult(true);
    }
    seal.vars.intSet(mctx,name,value);
    seal.replyToSender(ctx, msg, "强制更改成功！");
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["强制更改"] = cmdupdateValue;
