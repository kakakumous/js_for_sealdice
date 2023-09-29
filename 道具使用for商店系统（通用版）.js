// ==UserScript==
// @name         道具使用for商店系统
// @author       kakakumous
// @version      1.1.2
// @description  【尚未全面测试，发现bug欢迎带日志截图git留言或海豹4群@作者，详细教程在github链接推荐骰主查看】自用的道具使用dlc，高度参考并引用步棋商店系统插件，骰主指令添加物品信息|删除物品信息|检索物品信息|物品一览，普通指令查看|使用，测试阶段指令（仅骰主）强制更改|强制获取|查看属性
// @timestamp    1692412501
// 2023-08-19 10:35:01
// @license      CC-BY-NC-SA 4.0
// @homepageURL  https://github.com/kakakumous/js_for_sealdice
// ==/UserScript==

let ext = seal.ext.find("shop");
if (!ext) {
    ext = seal.ext.new("shop", "檀轶步棋", "1.0.0");
    seal.ext.register(ext);
}

//在此定义骰主.展示物品时每页展示的物品数
const ITEMS_PER_PAGE=10;
//在此定义限时buff的最大堆叠层数
const INIT_MAX_STATUS=10;

const BASIC_BACKPACK_MAXITEMS=50;//基础背包格数 跟随Rucksack
const ITEM_MAX_NUM=999;//最大堆叠数量 跟随Rucksack

const UseErrno = {
    1: "背包中无此物品",
    2: "背包中此物品数量/剩余使用次数不足",
    3: "此物品尚未实装",
    4: "啊哦 实装的effect出了点问题 请敲打骰主",
    5: "有更强力的效果,无法覆盖",
    6: "这个物品不能被使用",
    7: "这个物品使用需定义影响变量的最大值",
    8: "这个物品现在还不能使用（存在使用冷却）",
    9: "使用后背包会塞东西进来 暂不支持",
    10: "这个物品你每次只能使用一下"
};
class UseItem{
    details;
    userId;
    ctx;
    constructor(ctx) {
        let useDetailAll = JSON.parse(ext.storageGet("useDetails") || "{}");
        this.userId = ctx.player.userId;
        this.ctx = ctx;
        this.details = useDetailAll[this.userId] ? useDetailAll[this.userId]["useDetail"] : [];
    }
    save() {
        let useDetailAll = JSON.parse(ext.storageGet("useDetails") || "{}");
        if (!useDetailAll[this.userId]) {
            useDetailAll[this.userId] = {};
        }
        useDetailAll[this.userId]["useDetail"] = this.details;
        ext.storageSet("useDetails", JSON.stringify(useDetailAll));
    }
    deleteDetail(name) {
        for (let [i, v] of this.details.entries()) {
            if (v.name === name) {
                this.details.splice(i,1);
                this.save();
                return;
            }
        }
    }
    getOverview(name) {
        for (let [i, v] of this.details.entries()) {
            if (v.name === name) {
                return v;
            }
        }
        return null;
    }
    placeDetail(detail) {
        for (let [i, v] of this.details.entries()) {
            if (v.name === detail.name) {
                this.details[i].cdTillTime = detail.cdTillTime;
                this.details[i].restTimes = detail.restTimes;
                this.save();
                return 0;
            }
        }
        this.details.push(detail);
        this.save();
        return 0;
    }
    
    randomSplit(segment) {
        if (segment.includes('|')) {
            const parts = segment.split('|');
            const randomIndex = Math.floor(Math.random() * parts.length);
            return parts[randomIndex].trim();
        } else {
            return segment.trim();
        }
    }
    pushAllSplit(segment) {
        if (segment.includes('&')) {
            const parts = segment.split('&');
            return parts;
        } else {
            return segment;
        }
    }
    analyzeEffectOrigin(effectOrigin) {
        let result=[];
        if(!effectOrigin.includes('|') || !effectOrigin.includes('&')){
            result.push(effectOrigin);
        }else{
            result = this.pushAllSplit(this.randomSplit(effectOrigin));
        }
        return result;
    }
    analyzeEffectRAW(effectRAW) {
        const separators = ['+', '-', '*', '='];
        let result=[];
        for(let i=0;i<effectRAW.length;i++){
            let v=effectRAW[i];
            console.log(`当前处理效果:${v}`);
            for (const separator of separators) {
                if (v.includes(separator)) {
                    const segments = v.split(separator);
                    if (segments.length === 2) {
                        const effectType = segments[0].trim();
                        const effect = segments[1].trim();
                        console.log(`解析封装：`+separator+` `+effectType +` `+ effect);
                        result.push([separator, effectType, effect]);
                        return result;
                    } else {
                        throw new Error('输入字符串格式不正确');
                    }
                }
            }
        }
        throw new Error('未找到有效的分隔符');
    }
    useNomal( mctx, quantity, effectREADY){
        for(let i=0;i<effectREADY.length;i++){
            let singleEffect=effectREADY[i];
            const effectType = singleEffect[1];

            let old_effect=seal.vars.intGet(mctx, effectType)[0];
            let new_effect=old_effect;
            //初始化没有的最大值=-1（无上限）
            if(seal.vars.intGet(mctx, effectType+`_MAX`)[1]==false){
                seal.vars.intSet(mctx, effectType+`_MAX`,-1);
            }
            let effect_MAX=seal.vars.intGet(mctx, effectType+`_MAX`)[0];

            const opType = singleEffect[0];
            const effect = singleEffect[2];
            let num = 0;
            if(effect.endsWith(`%`)){
                if(effect_MAX==-1){return 7;}
                num=0.01*effect_MAX*parseFloat(effect.slice(0,effect.length-1));
            }else{
                num=parseFloat(effect);
            }
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
                seal.vars.intSet(mctx, effectType,parseInt(new_effect));
            }
            console.log(effectType+`=`+seal.vars.intGet(mctx, effectType)[0]);
        }
        return 0;
    }
    useStatus(itemOverview, mctx, quantity, effectREADY){
        for(let i=0;i<effectREADY.length;i++){
            let singleEffect=effectREADY[i];
            const timestamp = Date.parse(new Date())/1000;//10位 秒级时间戳
            let upHours = itemOverview.upTime*quantity;
            let effectType =singleEffect[1];
            let old_effect=seal.vars.intGet(mctx, effectType)[0];
            let new_effect=old_effect;
            //初始化没有的最大值=7(限时效果最多堆叠7层)
            if(seal.vars.intGet(mctx, effectType+`_MAX`)[1]==false){
                seal.vars.intSet(mctx, effectType+`_MAX`,INIT_MAX_STATUS);
            }        
            if(seal.vars.intGet(mctx, effectType+`_upTime`)[1]==false){
                seal.vars.intSet(mctx, effectType+`_upTime`,timestamp);
            }

            let effect_MAX=seal.vars.intGet(mctx, effectType+`_MAX`)[0];

            const opType = singleEffect[0];
            const effect = singleEffect[2];
            let num = 0;
            if(effect.endsWith(`%`)){
                num=0.01*effect_MAX*parseFloat(effect.slice(0,effect.length-1));
            }else{
                num=parseFloat(effect);
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
        return 0;
    }
    usePreCheck(detailOverview, sackOverview, itemOverview, quantity, mctx){
        let restTimes=0;
        if(!sackOverview){
            return 1;
        }
        let unUseQuantity=sackOverview.quantity;
        
        if(itemOverview.useTimes===`#`){
            return 6;
        }
        if(detailOverview){
            restTimes=detailOverview.restTimes;
            if(detailOverview.restTimes>0)unUseQuantity--;
        }
        console.log(`当前剩余次数${restTimes},背包内还有${unUseQuantity}个使用次数完整的。`);

        if(!isNaN(itemOverview.useTimes) && itemOverview.useTimes * unUseQuantity + restTimes < quantity){
            return 2;
        }
        
        if(itemOverview.cdTill!= 0){//存在使用CD的物品
            const timestamp = Date.parse(new Date())/1000;//10位 秒级时间戳
            if(detailOverview && timestamp<detailOverview.cdTillTime)return 8;
            if(quantity>1)return 10;
        }
        if(itemOverview.itemRecive!=`#`){
            //TODO:使用后获取物品
            return 9;
        }
        return 0;
    }
    useCost(backpack, useItem, itemOverview, name, quantity){
        let detailOverview = useItem.getOverview(name);
        let restTimes = 0;
        let cdTillTime = 0;
        //1.同步
        backpack.sameValue();
        //2.移除次数
        if(!isNaN(itemOverview.useTimes)){
            if(detailOverview){
                restTimes = detailOverview.restTimes;
            }
            console.log(`剩余次数：`+restTimes+`,指定数量：`+quantity);
            if(restTimes < quantity){//当前剩余次数不足以支撑使用
                let costQuantity = Math.ceil((quantity-restTimes)/itemOverview.useTimes);
                backpack.removeItem(name, costQuantity-1);
                restTimes = ((costQuantity*itemOverview.useTimes)+restTimes) - quantity;
                if(restTimes==0){
                    backpack.removeItem(name, 1);
                }
                console.log(`消耗数量：`+costQuantity+`,剩余次数：`+restTimes);
            }else{
                if(detailOverview){
                    restTimes = detailOverview.restTimes - quantity;
                    if(restTimes==0){
                        backpack.removeItem(name, 1);
                    }
                    console.log(`消耗次数,剩余次数：`+restTimes);
                }
            }
        }

        //3.cd刷新
        const timestamp = Date.parse(new Date())/1000;//10位 秒级时间戳
        if(itemOverview.cdTill!=0){
            let cdHours = itemOverview.cdTill;
            cdTillTime=timestamp+parseInt(cdHours*3600);
        }
        
        //4.TODO:获取物品
        //5.写回detail
        if(detailOverview&&restTimes==0&&itemOverview.cdTill==0){
            console.log(`删除本物品detail`);
            this.deleteDetail(name);
            return;
        }
        
        if((!isNaN(itemOverview.useTimes)&&itemOverview.useTimes!=1)||itemOverview.cdTill!=0){
            console.log(`更新/添加本物品detail：name：${name},restTimes:${restTimes},cdTillTime:${cdTillTime}`);
            this.placeDetail({name, restTimes, cdTillTime});
        }   
        
    }
    use(backpack, useItem, itemOverview, name, quantity, mctx){
        let sackOverview = backpack.getOverview(name);
        let detailOverview = useItem.getOverview(name);
        let res = this.usePreCheck(detailOverview, sackOverview, itemOverview, quantity, mctx);
        if(res!=0)return res;
        if(itemOverview.effect!=`#`){
            const effectOrigin=itemOverview.effect;
            //分析effect字符串，此次被选中的生效效果进数组
            const effectRAW = this.analyzeEffectOrigin(effectOrigin);
            let effectREADY = [];
            try {
                effectREADY = this.analyzeEffectRAW(effectRAW);
            } catch (error) {
                return 4;
            }
            if(itemOverview.upTime==0){//非状态物品 多用叠数值
                console.log(`使用数值物品`);
                res = this.useNomal( mctx, quantity, effectREADY);
                if(res!=0)return res;
            }else{//状态物品 多用叠时间
                console.log(`使用状态物品`);
                res = this.useStatus(itemOverview, mctx, quantity, effectREADY);
                if(res!=0)return res;
            }
        }
        this.useCost(backpack, useItem, itemOverview, name, quantity);
        return 0;
    }
}
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
    getOverviewByLoc(location) {
        if(location<this.itemInfo.length){
            return this.itemInfo[location];
        }
        return null;
    }
    placeItem(item) {
        for (let [i, v] of this.itemInfo.entries()) {
            if (v.name == item.name) {
                this.itemInfo[i].category = item.category;
                this.itemInfo[i].discreption = item.discreption;
                this.itemInfo[i].useTimes = item.useTimes;
                this.itemInfo[i].resMsg = item.resMsg;
                this.itemInfo[i].useMsg = item.useMsg;
                this.itemInfo[i].itemRecive = item.itemRecive;
                this.itemInfo[i].effect = item.effect;
                this.itemInfo[i].cdTill = item.cdTill;
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
    deleteItemByLoc(location){
        this.itemInfo.splice(location,1);
        this.save();
        return;
    }

    presentAll(){
        let res = ``;
        for (let i =0; i < this.itemInfo.length ; i++) {
            let v=this.itemInfo[i];
            res+=`|${i}-[${v.category}]${v.name}|`;
            if(res.length>2000)break;
        }
        return res;
    }
    present(category, page) {
        if (this.itemInfo.length <= 0) {
            return "还没有任何物品信息";
        }
        
        let arr = [];
        let i = 0;
        let thisPage = 0;//从第1页开始-0
        while(thisPage < page){

            let v=this.itemInfo[i];
            i++;
            if(v === undefined){
                break;
            }

            if(category != `#` && v.category != category){
                continue;
            }
            
            if(arr.length == ITEMS_PER_PAGE){
                thisPage++;
                if(thisPage == page)break;
                arr = [];
            }
            let res=`${i-1}~[${v.category}]${v.name}`;
            switch(v.useTimes){
                case `#`:res += `，不可直接使用`;break;
                case `!`:
                case `！`:res += `，无使用次数限制`;break;
                default:res += `，可使用${v.useTimes}次`;
            }
            if(v.itemRecive != `#`)res += `-使用后获取${v.itemRecive}`;
            if(v.effect != `#`)res += `-效果：${v.effect}`;
            if(v.upTime != 0)res+=`-效果持续:${v.upTime}小时`;
            if(v.cdTill != 0)res+=`-使用cd:${v.cdTill}小时`;
            arr.push(res);
        }

        if(arr.length == 0){
            return "这一页没有物品信息";
        }

        return arr.join("\n");
    }
    update1_0_0To1_1_0(){
        for (let [i, v] of this.itemInfo.entries()) {
            if (this.itemInfo[i].effectType !== undefined) {
                if(this.itemInfo[i].effectType != `#`){
                    this.itemInfo[i].category = `道具`;
                    this.itemInfo[i].effect = this.itemInfo[i].effectType+this.itemInfo[i].effect;
                    this.itemInfo[i].useTimes = 1;
                }else{
                    this.itemInfo[i].category = `素材`;
                    this.itemInfo[i].effect = `#`;
                    this.itemInfo[i].useTimes = `#`;
                }              
                this.itemInfo[i].resMsg = `#`;
                this.itemInfo[i].itemRecive = `#`;
                this.itemInfo[i].cdTill = 0;
                delete this.itemInfo[i]["effectType"];
                delete this.itemInfo[i]["ifStatus"];
            }
            
        }
        this.save();
    }
    autoUpdate(){//懒人用自动类型分拣 修正老的升级产生的数据库不准确
        for (let [i, v] of this.itemInfo.entries()) {
            if(this.itemInfo[i].useTimes == `#`){
                this.itemInfo[i].category = `素材`;
            }else{
                this.itemInfo[i].category = `道具`;
            }
            if(this.itemInfo[i].useTimes == 1){
                this.itemInfo[i].resMsg = `#`;
            }
        }
        this.save();
    }
}
class Rucksack {
    items;
    size;
    userId;
    ctx;
    money;
    constructor(ctx) {
        let itemAll = JSON.parse(ext.storageGet("backpacks") || "{}");
        this.userId = ctx.player.userId;
        this.ctx = ctx;
        this.size = BASIC_BACKPACK_MAXITEMS + seal.vars.intGet(ctx, `$m额外背包位`)[0];
        this.items = itemAll[this.userId] ? itemAll[this.userId]["backpack"] : [];
        this.money = seal.vars.intGet(ctx, `$m金币`)[0];
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
    sameValue(){//同步个人变量中影响背包的变量
        
        this.size =BASIC_BACKPACK_MAXITEMS + seal.vars.intGet(this.ctx, `$m额外背包位`)[0];
        this.money = seal.vars.intGet(this.ctx, `$m金币`)[0];

        
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
    
}
//=======================================================================================骰主对物品信息的操作
let cmdupdItemInfo = seal.ext.newCmdItemInfo();
cmdupdItemInfo.name = "updItemInfo";
cmdupdItemInfo.help = ".升级道具使用 YES//从1.0.x升级到1.1.x，1.1.x更新则无需使用指令升级，升级前请备份数据库防止发生不可挽回的错误";
cmdupdItemInfo.solve = (ctx, msg, args) => {
    if (args.getArgN(1) === "help") {
        let ret = seal.ext.newCmdExecuteResult(true);
        ret.showHelp = true;
        return ret;
    }
    if (ctx.privilegeLevel < 100) {
        seal.replyToSender(ctx, msg, seal.formatTmpl(ctx, "无权限"));
        return seal.ext.newCmdExecuteResult(true);
    }
    if(args.getArgN(1) !== "YES"){
        seal.replyToSender(ctx, msg, `在备份数据库后（data->default->extensions），发送【.升级道具使用 YES】进行更新`);
        return seal.ext.newCmdExecuteResult(true);
    }
    let itemInfo = new ItemInfo();
    itemInfo.update1_0_0To1_1_0();
    seal.replyToSender(ctx, msg, `执行成功，若物品信息数据库中存在旧数据会被更新`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["升级道具使用"] = cmdupdItemInfo;

let cmdAddItemInfo = seal.ext.newCmdItemInfo();
cmdAddItemInfo.name = "AddItemInfo";
cmdAddItemInfo.help = ".添加物品信息 <名称> <类别> <使用次数（！为永久，#为不可使用）> <影响变量，例：$m金币+1，可用&或|隔开 支持%表达）> <描述> <非最后一次使用回执> <损失回执> <获取物品> <使用冷却> <保持时长>（单位：小时）//仅限骰主使用";
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
    let name = args.getArgN(1).trim();
    let category = args.getArgN(2).trim();
    let useTimes = args.getArgN(3).trim()||`#`;
    let effect = args.getArgN(4).trim()||`#`;
    let discreption = args.getArgN(5).trim()||`你也看不太出来这到底是什么东西。`;
    let resMsg = args.getArgN(6).trim()||`你使用了`+name;
    let useMsg = args.getArgN(7).trim()||`你使用了`+name;//最后一次使用触发
    let itemRecive = args.getArgN(8).trim()||`#`;
    let cdTill = parseFloat(args.getArgN(9))||0;
    let upTime = parseFloat(args.getArgN(10))||0;

    if (!name) {
        seal.replyToSender(ctx, msg, ".添加物品信息 <名称> <类别> <使用次数（！为永久，#为不可使用）> <影响变量，例：$m金币+1，可用&或|隔开 支持%表达）> <描述> <非最后一次使用回执> <损失回执> <获取物品> <使用冷却> <保持时长>（单位：小时）");
        return seal.ext.newCmdExecuteResult(true);
    }
    if (!category) {
        seal.replyToSender(ctx, msg, "类别非空（用于分类检索） 参考：素材 食物 药品 工具 武器 装备 钥匙 道具 珍藏");
        return seal.ext.newCmdExecuteResult(true);
    }

    if ( !(useTimes==`#` || useTimes == `!` || useTimes == `！`)) {
        if(parseFloat(useTimes)<=0){
            seal.replyToSender(ctx, msg, "使用次数应为正整数或#（不可使用）、!（可永久使用）");
            return seal.ext.newCmdExecuteResult(true);
        }else{
            useTimes = parseFloat(useTimes);
        }
        
    }
    
    if (isNaN(cdTill) || isNaN(upTime) || cdTill<0 || upTime<0) {
        seal.replyToSender(ctx, msg, "参数错误。冷却时间和持续时间应该为非负整数");
        return seal.ext.newCmdExecuteResult(true);
    }

    let itemInfo = new ItemInfo();
    itemInfo.placeItem({ name, category, useTimes, effect, discreption, resMsg, useMsg, itemRecive, cdTill, upTime});
    let res = `已添加（覆盖）新${category}:${name}`;
    switch(useTimes){
        case `#`:break;
        case `!`:
        case `！`:res += `，无使用次数限制`;break;
        default:res += `，可使用${useTimes}次`;
    }
    if(itemRecive != `#`)res += `使用后获取${itemRecive}`;
    if(effect != `#`)res += `\n效果：${effect}`;
    if(upTime != 0)res+=`\n效果持续:${upTime}小时`;
    if(cdTill != 0)res+=`\n使用cd:${cdTill}小时`;

    seal.replyToSender(ctx, msg, res);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["添加物品信息"] = cmdAddItemInfo;

let cmddelItemInfo = seal.ext.newCmdItemInfo();
cmddelItemInfo.name = "delItemInfo";
cmddelItemInfo.help = ".删除物品信息 <名称> //删除物品信息，仅限骰主使用 TODO:删除所有背包中的此物品（谨慎操作）";
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
        seal.replyToSender(ctx, msg, "参数错误。用法：.删除物品信息 <名称>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let itemInfo = new ItemInfo();
    if(!isNaN(name) && parseInt(name)>=0){
        itemInfo.deleteItemByLoc(name);
    }else{
        itemInfo.deleteItem(name);
    }

    seal.replyToSender(ctx, msg, `执行成功，若物品信息数据库中存在该物品则会被删除`);
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["删除物品信息"] = cmddelItemInfo;

let cmdlistItemInfo = seal.ext.newCmdItemInfo();
cmdlistItemInfo.name = "listItemInfo";
cmdlistItemInfo.help = ".物品一览 <类别（查看全部用#占位）> <页数（为空默认为1）> //仅限骰主使用 按页数查询";
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
    let category = args.getArgN(1)||`#`;
    let page = parseInt(args.getArgN(2))||1;

    if (page<=0) {
        seal.replyToSender(ctx, msg, "页数应>0");
        return seal.ext.newCmdExecuteResult(true);
    }

    let itemInfo = new ItemInfo();

    let items = itemInfo.present(category, page);

    if(category == `总览`){
        items = itemInfo.presentAll();
    }

    seal.replyToSender(ctx, msg, `物品一览<`+page+`>：\n${items}\n查看物品全部信息请.检索物品信息 <名称>`);

    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["物品一览"] = cmdlistItemInfo;

let cmdsearchItemInfo = seal.ext.newCmdItemInfo();
cmdsearchItemInfo.name = "searchItemInfo";
cmdsearchItemInfo.help = ".检索物品信息 <名称/序号> //检索物品信息，仅限骰主使用";
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
        seal.replyToSender(ctx, msg, "参数错误。用法：.检索物品信息 <名称/序号>");
        return seal.ext.newCmdExecuteResult(true);
    }
    let itemInfo = new ItemInfo();
    let v = itemInfo.getOverview(name);
    if(!isNaN(name) && parseInt(name)>=0){
        v=itemInfo.getOverviewByLoc(parseInt(name));
    }
    if(v!=null){
        let res=`【${v.category}】${v.name}:${v.discreption}`;
        switch(v.useTimes){
            case `#`:res += `\n不可直接使用`;break;
            case `!`:
            case `！`:res += `\n无使用次数限制`;break;
            default:res += `\n可使用${v.useTimes}次`;
        }
        res += `\n非最后一次使用显示:${v.resMsg}`;
        res += `\n最后一次使用显示：${v.useMsg}`;
        if(v.itemRecive != `#`)res += `-使用后获取${v.itemRecive}`;
        if(v.effect != `#`)res += `\n效果：${v.effect}`;
        if(v.upTime != 0)res+=`\n效果持续:${v.upTime}小时`;
        if(v.cdTill != 0)res+=`\n使用cd:${v.cdTill}小时`;

        res += `\n.添加物品信息 ${v.name} ${v.category} ${v.useTimes} ${v.effect} ${v.discreption} ${v.resMsg} ${v.useMsg} ${v.itemRecive} ${v.cdTill} ${v.upTime}`;
        seal.replyToSender(ctx, msg, res);
    }else{
        seal.replyToSender(ctx, msg, `数据中目前没有这个物品/序号。`);
    }
    return seal.ext.newCmdExecuteResult(true);
};
ext.cmdMap["检索物品信息"] = cmdsearchItemInfo;
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
    console.log(`物品生效于：`+mctx.player.userId);

    if (!name || quantity<=0) {
        seal.replyToSender(ctx, msg, "参数错误。用法：.使用 <名称> <数量(大于0)> <目标（at） 为空则指自己>");
        return seal.ext.newCmdExecuteResult(true);
    }

    let itemInfo = new ItemInfo();
    let backpack = new Rucksack(ctx);
    let useItem = new UseItem(ctx);
    let itemOverview = itemInfo.getOverview(name);
    let detailOverview = useItem.getOverview(name);
    let restTimes_old = 0;
    if (!itemOverview) {
        seal.replyToSender(ctx, msg, `使用失败：${UseErrno[3]}`);
        return seal.ext.newCmdExecuteResult(true);
    }
    if(detailOverview){
        restTimes_old = detailOverview.restTimes;
    }
    let retNum = useItem.use(backpack, useItem, itemOverview, name, quantity, mctx);
    if (retNum != 0) {
        seal.replyToSender(ctx, msg, `使用失败：${UseErrno[retNum]}`);
    }
    else {
        if(!isNaN(itemOverview.useTimes)&&(itemOverview.useTimes==1||(detailOverview&&restTimes_old<=quantity)||itemOverview.useTimes<=quantity)){
            seal.replyToSender(ctx, msg, itemOverview.useMsg);
        }else{
            seal.replyToSender(ctx, msg, itemOverview.resMsg);
        }
        
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