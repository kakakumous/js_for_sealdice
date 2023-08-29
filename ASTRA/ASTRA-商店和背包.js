// ==UserScript==
// @name         ASTRA-商店系统
// @author       檀轶步棋|AS:kakakumous
// @version      1.0.2
// @timestamp    1686102732
// @license      MIT
// @description  ASTRA_商店和背包(Shop&Rucksack)指令有：上架、下架、购买、出售、丢弃、展示
// @homepageURL  https://github.com/Verplitic
// ==/UserScript==

const RETIRE=0.8;//售出店内已有物品打折比例 跟随Shop
const BASIC_BACKPACK_MAXITEMS=49;//基础背包格数 跟随Rucksack
const ITEM_MAX_NUM=777;//最大堆叠数量 跟随Rucksack
let ext = seal.ext.find("Astra_backpack");
if (!ext) {
    ext = seal.ext.new("Astra_backpack", "kakakumous", "1.0.0");
    seal.ext.register(ext);
}

const TradeErrno = {
    1: "商店中无此商品",
    2: "商店中此商品数量不足",
    3: "用户月光币不足",
    4: "背包中没有此物品",
    5: "背包中此物品数量不足",
    6: "背包已满，不能再放入物品",
    7: "你可拥有的此物品数量达到上限"
};
class Shop {
    goods;
    constructor() {
        this.goods = JSON.parse(ext.storageGet("shop") || "[]");
    }
    save() {
        ext.storageSet("shop", JSON.stringify(this.goods));
    }
    getOverview(name) {
        for (let [i, v] of this.goods.entries()) {
            if (v.name === name) {
                return v;
            }
        }
        return null;
    }
    placeItem(item) {
        for (let [i, v] of this.goods.entries()) {
            if (v.name == item.name) {
                this.goods[i].quantity += item.quantity;
                this.save();
                return;
            }
        }
        this.goods.push(item);
        this.save();
    }
    removeItem(name, quantity = 1) {
        for (let [i, v] of this.goods.entries()) {
            if (v.name === name) {
                if (quantity >= v.quantity) {
                    this.goods.splice(i,1);
                }
                else {
                    this.goods[i].quantity -= quantity;
                }
                this.save();
                return;
            }
        }
    }
    deleteItem(name) {
        for (let [i, v] of this.goods.entries()) {
            if (v.name === name) {
                this.goods.splice(i,1);
                this.save();
                return;
            }
        }
    }
    present() {
        if (this.goods.length <= 0) {
            return "空空如也";
        }
        let arr = [];
        for (let i of this.goods) {
            arr.push(`- ${i.name}  数量: ${i.quantity}  单价: ${i.price}`);
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
        this.crystal = seal.vars.intGet(this.ctx, `$m魔力水晶`)[0];
        
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
    present() {
        let arr = [];
        arr.push(`【物品栏：${this.items.length}/${this.size}】`);
        for (let i of this.items) {
            arr.push(`- ${i.name}  数量: ${i.quantity}`);
        }
        return arr.join("\n");
    }
    purchase(shop, name, quantity = 1) {
        let shopOverview = shop.getOverview(name);
        if (!shopOverview) {
            return 1;
        }
        else if (shopOverview.quantity < quantity) {
            return 2;
        }
        else if (this.money < (shopOverview.price * quantity)) {
            return 3;
        }
        let res=this.placeItem({name, quantity});
        if(res!=0){return res;}
        this.money -= shopOverview.price * quantity;
        shop.removeItem(name, quantity);
        return 0;
    }
    sell(shop, name, price, quantity = 1) {
        let sackOverview = this.getOverview(name);
        if (!sackOverview) {
            return 4;
        }
        else if (sackOverview.quantity < quantity) {
            return 5;
        }
        this.money += price * quantity;
        shop.placeItem({ name, quantity, price });
        this.removeItem(name, quantity);
        return 0;
    }
}
let cmdSupply = seal.ext.newCmdItemInfo();
cmdSupply.name = "supply";
cmdSupply.help = ".上架 <名称> <单价(大于等于0)> <数量(大于0，默认为1)> //向商店添加商品，仅限骰主使用";
cmdSupply.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    let name = args.getArgN(1);
    let price = parseInt(args.getArgN(2));
    let quantity = parseInt(args.getArgN(3)) || 1;
    if (!name || isNaN(price) || price < 0 || !quantity || quantity <= 0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.上架 <名称> <单价> <数量(大于0，默认为1)>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let shop = new Shop();
    shop.placeItem({ name, price, quantity });
    seal.replyToSender(ctx, msg, `已向商店添${quantity}个${name}，单价为${price}`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["上架"] = cmdSupply;
let cmdRetract = seal.ext.newCmdItemInfo();
cmdRetract.name = "retract";
cmdRetract.help = ".下架 <名称> //从商店中下架物品，仅限骰主使用";
cmdRetract.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "核心:提示_无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    let name = args.getArgN(1);
    if (!name) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.下架 <名称>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let shop = new Shop();
    shop.deleteItem(name);
    seal.replyToSender(ctx, msg, `执行成功，若商店中存在该商品则会被删除`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["下架"] = cmdRetract;
let cmdBuy = seal.ext.newCmdItemInfo();
cmdBuy.name = "buy";
cmdBuy.help = ".购买 <名称> <数量(大于0，默认为1)> //从商店中购买物品";
cmdBuy.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    let quantity = parseInt(args.getArgN(2)) || 1;
    if (!name || !quantity || quantity <= 0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.购买 <名称> <数量(大于0，默认为1)>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let backpack = new Rucksack(ctx);
    let retNum = backpack.purchase(new Shop(), name, quantity);
    if (retNum !== 0) {
        seal.replyToSender(ctx, msg, `交易时发生错误：${TradeErrno[retNum]}`);
    }
    else {
        seal.replyToSender(ctx, msg, `购买成功！\n${name}x${quantity}已经放入你的背包。\n账户余额: ${backpack.money}月光币，${backpack.crystal}魔力水晶`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["购买"] = cmdBuy;

let cmdSell = seal.ext.newCmdItemInfo();
cmdSell.name = "sell";
cmdSell.help = ".出售 <名称> <数量(大于0，默认为1)> //从背包中出售商品到商店";
cmdSell.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    let quantity = parseInt(args.getArgN(2)) || 1;
    if (!name || !quantity || quantity <= 0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.出售 <名称> <数量(大于0，默认为1)>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let shop = new Shop();
    let backpack = new Rucksack(ctx);
    let shopOverview = shop.getOverview(name);
    let price = 0;
    let sellMsg = "";
    if (!shopOverview) {
        price = Math.floor(Math.random() * 10) + 1;
        sellMsg = `商店中没有这个商品，所以店主以${price}的单价收购了你的物品！`;
    }
    else {
        price = shopOverview.price*RETIRE;
        sellMsg = `你以${price}的单价卖出了商品！`;
    }
    let retNum = backpack.sell(shop, name, price, quantity);
    if (retNum != 0) {
        seal.replyToSender(ctx, msg, `交易时发生错误：${TradeErrno[retNum]}`);
    }
    else {
        seal.replyToSender(ctx, msg, sellMsg + `\n账户余额: ${backpack.money}`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["出售"] = cmdSell;
let cmdDiscard = seal.ext.newCmdItemInfo();
cmdDiscard.name = "discard";
cmdDiscard.help = ".丢弃 <名称> <数量(大于0，默认为全部)> //从背包中丢弃物品，谨慎使用";
cmdDiscard.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    let quantity = parseInt(args.getArgN(2)) || Infinity;
    if (!name || !quantity || quantity <= 0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.丢弃 <名称> <数量(大于0，默认为全部)>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let backpack = new Rucksack(ctx);
    backpack.sameValue(ctx);
    backpack.removeItem(name, quantity);
    seal.replyToSender(ctx, msg, `执行成功，若背包中存在该物品则会被丢弃`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["丢弃"] = cmdDiscard;
let cmdShow = seal.ext.newCmdItemInfo();
cmdShow.name = "show";
cmdShow.help = ".展示 商店/背包(不填默认为背包) //展示商店或背包中的货物。";
cmdShow.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1) || "背包";
    if (name !== "背包" && name !== "商店") {
        seal.replyToSender(ctx, msg, "参数错误。用法：.展示 商店/背包(不填默认为背包)");
        return seal.ext.newCmdExecuteResult(true);
    }
    else if (name === "背包") {
        let backpack = new Rucksack(ctx);
        let items = backpack.present();
        seal.replyToSender(ctx, msg, `${ctx.player.name}的背包:\n月光币( ${backpack.money}）\n魔力水晶（${backpack.crystal}）\n${items}`);
    }
    else {
        let shop = new Shop();
        let goods = shop.present();
        seal.replyToSender(ctx, msg, `商店货架：\n${goods}`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["展示"] = cmdShow;
