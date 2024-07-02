// ==UserScript==
// @name         商店系统（基于1.0.0的私货版）
// @author       原作：檀轶步棋|魔改:kakakumous
// @version      1.0.5
// @timestamp    1686102732
// @license      CC-BY-NC-SA 4.0
// @description  原作更新到1.2+了至少，能下到原作不需要这么多花活功能的还是在群里下。指令仍旧是上架、下架、购买、出售、丢弃、展示,骰主作弊：强制获取，支持了多商店多币种（需脚本内替换定义，有一定门槛（虽然本来就是纯自用）），为了和谐私货信息新币种只是叫水晶（什么手游）。和道具使用的联动：可以分页分类查看背包内道具。
// @homepageURL  https://github.com/kakakumous/js_for_sealdice
// ==/UserScript==

const RETIRE=0.8;//售出店内已有物品打折比例 跟随Shop
const BASIC_BACKPACK_MAXITEMS=50;//基础背包格数 跟随Rucksack
const ITEM_MAX_NUM=999;//最大堆叠数量 跟随Rucksack
let ext = seal.ext.find("shop");
if (!ext) {
    ext = seal.ext.new("shop", "檀轶步棋", "1.0.0");
    seal.ext.register(ext);
}

const TradeErrno = {
    1: "商店中无此商品",
    2: "商店中此商品数量不足",
    3: "你持有的货币不足以购买此商品",
    4: "背包中没有此物品",
    5: "背包中此物品数量不足",
    6: "背包已满，不能再放入物品",
    7: "你可拥有的此物品数量达到上限",
    8: "此商店中没有这个商品，无法出售"
};
class Shop {
    goods;
    shopType;
    costType;
    constructor(shopTypeRAW) {
        this.shopType=this.progressShopType(shopTypeRAW);
        this.goods = JSON.parse(ext.storageGet(this.shopType) || "[]");
    }
    progressShopType(shopTypeRAW){
        this.costType=`金钱`;
        let shopType = "shop";//非特殊情况随便乱打字一律进金钱默认商店，进店匹配下列字符串才有隐藏菜单（嗯）
        switch (shopTypeRAW) {
            case `#`:
            case `日常`:break;
            case `隐藏`:shopType = "shop_hide";break;//例：一个隐藏的金钱商店
            case `法术`:shopType = "shop_crystal";this.costType=`水晶`;break;//例：一个隐藏的水晶商店
            default:
                break;
        }
        return shopType;
    }
    save() {
        ext.storageSet(this.shopType, JSON.stringify(this.goods));
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
            arr.push(`- ${i.name}  库存: ${i.quantity}  单价: ${i.price}${this.costType}`);
        }
        return arr.join("\n");
    }
    
}
class ItemInfo {
    itemInfo;
    constructor() {
        this.itemInfo=JSON.parse(ext.storageGet("items") || "[]");
    }
    getOverview(name) {
        for (let [i, v] of this.itemInfo.entries()) {
            if (v.name === name) {
                return v;
            }
        }
        return null;
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
        this.crystal = seal.vars.intGet(ctx, `$m水晶`)[0];
    }
    save() {
        let itemAll = JSON.parse(ext.storageGet("backpacks") || "{}");
        if (!itemAll[this.userId]) {
            itemAll[this.userId] = {};
        }
        itemAll[this.userId]["backpack"] = this.items;
        itemAll[this.userId]["money"] = this.money;
        itemAll[this.userId]["crystal"] = this.crystal;
        seal.vars.intSet(this.ctx, "$m金钱", this.money);
        seal.vars.intSet(this.ctx, "$m水晶", this.crystal);
        ext.storageSet("backpacks", JSON.stringify(itemAll));
    }
    sameValue(){//同步个人变量中影响背包的变量
        
        this.size =BASIC_BACKPACK_MAXITEMS + seal.vars.intGet(this.ctx, `$m额外背包位`)[0];
        this.money = seal.vars.intGet(this.ctx, `$m金钱`)[0];
        this.crystal = seal.vars.intGet(this.ctx, `$m水晶`)[0];
        
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
    present(category) {
        let arr = [];
        arr.push(`【物品栏：${this.items.length}/${this.size}】`);
        const itemInfos = new ItemInfo();
        if(category == `#`){
            for (let i of this.items) {
                const itemInfo = itemInfos.getOverview(i.name);
                if(itemInfo != null && itemInfo.category){
                    arr.push(`- [${itemInfo.category}]${i.name}  数量: ${i.quantity}`);
                }else{
                    arr.push(`- ${i.name}  数量: ${i.quantity}`);
                }
            }
        }else{
            arr.push(`${category}---------------`);
            for (let i of this.items) {
                const itemInfo = itemInfos.getOverview(i.name);
                if(itemInfo != null && itemInfo.category === category)arr.push(`- ${i.name}  数量: ${i.quantity}`);
            }
        }
        return arr.join("\n");
    }
    
    purchase(shop, name, quantity = 1) {//TODO:一个商店里出现多货币购买（有点鸡肋，但可rp）
        let shopOverview = shop.getOverview(name);
        const costType = shop.costType;
        if (!shopOverview) {
            return 1;
        }
        if (shopOverview.quantity < quantity) {
            return 2;
        }

        let cash=seal.vars.intGet(this.ctx, `$m`+costType)[0];
        if (cash < (shopOverview.price * quantity)) {
            return 3;
        }
        let res=this.placeItem({name, quantity});
        if(res!=0){return res;}
        cash -= shopOverview.price * quantity;
        seal.vars.intSet(this.ctx, `$m`+costType, cash);
        if(costType == `金钱`)this.money = cash;
        if(costType == `水晶`)this.crystal = cash;
        shop.removeItem(name, quantity);
        return 0;
    }
    sell(shop, name, price, quantity = 1) {
        let sackOverview = this.getOverview(name);
        const costType = shop.costType;
        if (!sackOverview) {
            return 4;
        }
        else if (sackOverview.quantity < quantity) {
            return 5;
        }
        let cash=seal.vars.intGet(this.ctx, `$m`+costType)[0];
        cash += price * quantity;
        seal.vars.intSet(this.ctx, `$m`+costType, cash);
        if(costType == `金钱`)this.money = cash;
        if(costType == `水晶`)this.crystal = cash;
        shop.placeItem({ name, quantity, price });
        this.removeItem(name, quantity);
        return 0;
    }
}
let cmdSupply = seal.ext.newCmdItemInfo();
cmdSupply.name = "supply";
cmdSupply.help = ".上架 <商店类型(shop)> <名称> <单价(大于等于0)> <数量(大于0，默认为1)> //向商店添加商品，仅限骰主使用";
cmdSupply.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    let shopType = args.getArgN(1);
    let name = args.getArgN(2);
    let price = parseInt(args.getArgN(3));
    let quantity = parseInt(args.getArgN(4)) || 1;

    if (!shopType || !name || isNaN(price) || price < 0 || !quantity || quantity <= 0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.上架 <商店类型> <名称> <单价(大于等于0)> <数量(大于0，默认为1)> ");
        return seal.ext.newCmdExecuteResult(true);
    }
    let shop = new Shop(shopType);
    shop.placeItem({ name, price, quantity });
    seal.replyToSender(ctx, msg, `已向${shopType}添加${quantity}个${name}，单价为${price}`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["上架"] = cmdSupply;
let cmdRetract = seal.ext.newCmdItemInfo();
cmdRetract.name = "retract";
cmdRetract.help = ".下架 <商店类型（shop）> <名称> //从商店中下架物品，仅限骰主使用";
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
    let shopType = args.getArgN(1);
    let name = args.getArgN(2);
    if (!shopType || !name) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.下架 <名称>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let shop = new Shop(shopType);
    shop.deleteItem(name);
    seal.replyToSender(ctx, msg, `执行成功，若商店中存在该商品则会被删除`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["下架"] = cmdRetract;
let cmdBuy = seal.ext.newCmdItemInfo();
cmdBuy.name = "buy";
cmdBuy.help = ".购买 <商店类型（shop）> <名称> <数量(大于0，默认为1)> //从商店中购买物品";
cmdBuy.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let shopType = args.getArgN(1);
    let name = args.getArgN(2);
    let quantity = parseInt(args.getArgN(3)) || 1;
    if (!name || !quantity || quantity <= 0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.购买 <商店类型（shop）> <名称> <数量(大于0，默认为1)> ");
        return seal.ext.newCmdExecuteResult(true);
    }
    let backpack = new Rucksack(ctx);
    let retNum = backpack.purchase(new Shop(shopType), name, quantity);
    if (retNum !== 0) {
        seal.replyToSender(ctx, msg, `交易时发生错误：${TradeErrno[retNum]}`);
    }
    else {
        seal.replyToSender(ctx, msg, `购买成功！\n${name}x${quantity}已经放入你的背包。\n账户余额: ${backpack.money}金钱，${backpack.crystal}水晶`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["购买"] = cmdBuy;

let cmdSell = seal.ext.newCmdItemInfo();
cmdSell.name = "sell";
cmdSell.help = ".出售 <商店类型（shop）> <名称> <数量(大于0，默认为1)> //从背包中出售商品到商店";
cmdSell.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let name = args.getArgN(1);
    let quantity = parseInt(args.getArgN(2)) || 1;
    if (!name || !quantity || quantity <= 0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.出售 <商店类型（shop）> <名称> <数量(大于0，默认为1)>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let shop = new Shop(shopType);
    let backpack = new Rucksack(ctx);
    let shopOverview = shop.getOverview(name);
    let retNum = 0;
    let price = 0;
    let sellMsg = "";
    if (!shopOverview) {
        retNum = 8;
    }
    else {
        price = shopOverview.price*RETIRE;
        sellMsg = `你以${price}的单价卖出了商品！`;
        retNum = backpack.sell(shop, name, price, quantity);
    }
    
    if (retNum != 0) {
        seal.replyToSender(ctx, msg, `交易时发生错误：${TradeErrno[retNum]}`);
    }
    else {
        seal.replyToSender(ctx, msg, sellMsg + `\n账户余额: 金钱(${backpack.money})`);
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
cmdShow.help = ".展示 <类别(默认为全部：#)> //展示背包中的货物。";
cmdShow.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let category = args.getArgN(1) || `#`;

    let backpack = new Rucksack(ctx);
    let items = backpack.present(category);

    seal.replyToSender(ctx, msg, `${ctx.player.name}的背包:\n金钱( ${backpack.money}）\n水晶（${backpack.crystal}）\n${items}`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["展示"] = cmdShow;

let cmdShowShop = seal.ext.newCmdItemInfo();
cmdShowShop.name = "ShowShop";
cmdShowShop.help = ".浏览商店 <商店类型（shop）> //展示背包中的货物。";
cmdShowShop.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    let shopType = args.getArgN(1) || "#";

    let shop = new Shop(shopType);
    let goods = shop.present();
    seal.replyToSender(ctx, msg, `此商店货架：\n${goods}`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["浏览商店"] = cmdShowShop;

let cmdallgetItem = seal.ext.newCmdItemInfo();
cmdallgetItem.name = "allgetItem";
cmdallgetItem.help = ".强制获取 <名称> <数量>  <目标（at） 为空则指自己>//仅限骰主使用";
cmdallgetItem.allowDelegate = true;
cmdallgetItem.solve = (ctx, msg, args) => {
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
ext.cmdMap["强制获取"] = cmdallgetItem;