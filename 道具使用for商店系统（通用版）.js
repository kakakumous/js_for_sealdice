// ==UserScript==
// @name         道具使用for商店系统
// @author       kakakumous
// @version      1.0.0
// @description  自用的道具使用dlc 高度参考并引用步棋商店系统插件（扩展的扩展.jpg,数据库共享） 背包类复制粘贴+新增方法use
// @timestamp    1692412501
// 2023-08-19 10:35:01
// @license      MIT
// @homepageURL  https://github.com/kakakumous/js_for_sealdice
// ==/UserScript==

//TODO:分页查看全部的道具信息 也没那么多吧（目移）
//TODO:对at的人使用道具

let ext = seal.ext.find("shop");
if (!ext) {
    ext = seal.ext.new("shop", "檀轶步棋", "1.0.0");
    seal.ext.register(ext);
}
const UseErrno = {
    1: "背包中无此物品",
    2: "背包中此物品数量不足",
    3: "此物品尚未实装omo",
    4: "啊哦 实装的effect出了点问题 请敲打策划",
    5: "冥冥中一种神奇的直觉让你放弃了使用（有更强力的效果无法覆盖）"
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
                this.itemInfo.splice(i);
                this.save();
                return;
            }
        }
    }
    present() {
        if (this.itemInfo.length <= 0) {
            return "还没有任何道具信息";
        }
        let arr = [];
        for (let i of this.itemInfo) {
            let str=`~ ${i.name}-影响变量: ${i.effectType}${i.effect}`;
            if(i.ifStatus==1)str=str+`持续时间+${i.upTime}`;
            arr.push(str);
        }
        return arr.join("\n");
    }
}
class Rucksack {
    items;
    userId;
    ctx;
    money;
    
    constructor(ctx) {
        let itemAll = JSON.parse(ext.storageGet("backpacks") || "{}");
        this.userId = ctx.player.userId;
        this.ctx = ctx;
        this.items = itemAll[this.userId] ? itemAll[this.userId]["backpack"] : [];
        this.money = itemAll[this.userId] ? itemAll[this.userId]["money"] : seal.vars.intGet(ctx, `$m金币`)[0];
        
    }
    save() {
        let itemAll = JSON.parse(ext.storageGet("backpacks") || "{}");
        if (!itemAll[this.userId]) {
            itemAll[this.userId] = {};
        }
        itemAll[this.userId]["backpack"] = this.items;
        itemAll[this.userId]["money"] = this.money;
        seal.vars.intSet(this.ctx, "$m金币", this.money);
        ext.storageSet("backpacks", JSON.stringify(itemAll));
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
                this.items[i].quantity += item.quantity;
                this.save();
                return;
            }
        }
        console.log("added");
        this.items.push(item);
        this.save();
    }
    removeItem(name, quantity = 1) {
        for (let [i, v] of this.items.entries()) {
            if (v.name === name) {
                if (quantity >= v.quantity) {
                    this.items.splice(i);
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
                this.items.splice(i);
                this.save();
                return;
            }
        }
    }
    present() {
        if (this.items.length <= 0) {
            return "空空如也";
        }
        let arr = [];
        for (let i of this.items) {
            arr.push(`- ${i.name}  数量: ${i.quantity}`);
        }
        return arr.join("\n");
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
        if(itemOverview.ifStatus==0){//非状态道具 多用叠数值
            let effectType=itemOverview.effectType;
            let effect=itemOverview.effect;
            console.log(`试图初始化没有的变量=0`);
            if(seal.vars.intGet(mctx, effectType)[1]==false){
                seal.vars.intSet(mctx, effectType,0);
            }
            console.log(`试图初始化没有的最大值=-1（无上限）`);
            if(seal.vars.intGet(mctx, effectType+`_MAX`)[1]==false){
                seal.vars.intSet(mctx, effectType+`_MAX`,-1);
                console.log(`初始化成功`);
            }
            let old_effect=seal.vars.intGet(mctx, effectType)[0];
            let new_effect=old_effect;

            const opType=effect.charAt(0);
            console.log(opType);
            const num=parseFloat(effect.slice(1,effect.length));
            console.log(num);
            
            switch(opType){
                case `=`:new_effect=num;break;
                case `+`:new_effect=old_effect+num*quantity;break;
                case `-`:new_effect=old_effect-num*quantity;break;
                case `*`:new_effect=old_effect*Math.pow(num,quantity);break;
                default:return 4;
            }
            if(seal.vars.intGet(mctx, effectType+`_MAX`)[0]!=-1&&seal.vars.intGet(mctx, effectType+`_MAX`)[0]<new_effect){
                seal.vars.intSet(mctx, effectType,seal.vars.intGet(mctx, effectType+`_MAX`)[0]);
            }else{
                seal.vars.intSet(mctx, effectType,new_effect);
            }
        }else{//状态道具 多用叠时间
            const timestamp = Date.parse(new Date());//秒级时间戳
            let effectType=itemOverview.effectType;
            let effect=itemOverview.effect;
            let upHours=itemOverview.upTime*quantity;
            console.log(`试图初始化没有的变量=0`);
            if(seal.vars.intGet(mctx, effectType)[1]==false){
                seal.vars.intSet(mctx, effectType,0);
            }            
            console.log(`试图初始化没有的持续时间=0`);
            if(seal.vars.intGet(mctx, effectType+`_upTime`)[1]==false){
                seal.vars.intSet(mctx, effectType+`_upTime`,timestamp);
            }

            let old_effect=seal.vars.intGet(mctx, effectType)[0];
            let new_effect=old_effect;

            const opType=effect.charAt(0);
            console.log(opType);
            const num=parseInt(effect.slice(1,effect.length));
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
            seal.vars.intSet(mctx, effectType,new_effect);
            console.log(old_effect+`->`+new_effect);
            console.log(effectType+`=`+seal.vars.intGet(mctx, effectType)[0]);
            seal.vars.intSet(mctx, effectType+`_upTime`,timestamp+upHours*3600);
        }
        this.removeItem(name, quantity);
        return 0;
    }
}
//=============================================================骰主对道具信息的操作
let cmdAddItemInfo = seal.ext.newCmdItemInfo();
cmdAddItemInfo.name = "AddItemInfo";
cmdAddItemInfo.help = ".添加道具信息 <名称> <影响变量（例：$m金币）> <影响变量参数（=+-*操作符开头，例：+1即为金币+1）> <描述> <使用回执> <是否限时（1是0否）> <保持时长(小时 限时为1时需>0)>//仅限骰主使用";
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
        seal.replyToSender(ctx, msg, "参数错误。参考：.添加道具信息 <名称> <影响变量> <影响变量参数（=+-*操作符开头）> <描述> <使用回执> <是否限时（1是0否）> <保持时长(小时 限时为1时需>0)\n最后两个参数不填默认为非状态变更道具");
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
cmdlistItemInfo.help = ".展示道具 //展示道具信息，仅限骰主使用 TODO:查询道具信息（骰主版） 按页数查询";
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
    let page = args.getArgN(1)||1;

    let itemInfo = new ItemInfo();
    let items = itemInfo.present();

    seal.replyToSender(ctx, msg, `道具信息<`+page+`>：\n${items}\n查看道具全部信息请.检索道具信息 <名称>`);

    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["展示道具"] = cmdlistItemInfo;

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
    let quantity = parseInt(args.getArgN(2))||1;

    const mctx = getCtxProxyFirst(ctx, msg)||ctx;//不好用 获取不到 有空自己写一个反解cq码呜呜呜
    console.log(`道具生效于：`+mctx.player.userId);

    if (!name || isNaN(quantity)||quantity>0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.使用 <名称> <数量(大于0)>");
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
        if(mctx.player.userId!==ctx.player.userId){
            seal.replyPerson(mctx, msg, `${ctx.player.name}对你使用了${quantity}个${name}!`);
        }
        seal.replyToSender(ctx, msg, itemOverview.useMsg);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["使用"] = cmduseItem;

//=========================================================================测试期间特供指令（或者说是内部？）
let cmdcheckValue = seal.ext.newCmdItemInfo();
cmdcheckValue.name = "checkValue";
cmdcheckValue.help = ".查看属性 <名称（例：$mHP）> <目标（at,为空则默认为自己）>//查看属性";
cmdcheckValue.allowDelegate = true;
cmdcheckValue.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    const mctx = seal.getCtxProxyFirst(ctx, msg)||ctx;
    if (!name) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.查看属性 <名称> <目标（at,为空则默认为自己）>");
        return seal.ext.newCmdExecuteResult(true);
    }
    try {
        seal.replyToSender(ctx, msg,seal.vars.intGet(mctx, name)[0]);
    } catch (error) {
        seal.replyToSender(ctx, msg, `没有找到这条属性喵。`);//不触发 找不到都返回0
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["查看属性"] = cmdcheckValue;