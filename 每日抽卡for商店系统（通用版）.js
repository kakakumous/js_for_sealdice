// ==UserScript==
// @name         每日抽卡for商店系统
// @author       kakakumous
// @version      1.0.1
// @description  单抽：抽一下 十连：抽十下 数据统计:想看自己的倒霉程度 排行：接入端分类-想看一群倒霉蛋 全端-想看最倒霉的倒霉蛋
// @timestamp    1693125392
// 2023-08-27 16:36:32
// @license      CC-BY-NC-SA 4.0
// @homepageURL  https://github.com/kakakumous/js_for_sealdice
// ==/UserScript==
const MONEY_COST = 10;
const GACHA_MULTI = 10;
const MAX_MONEYGACHA_PERDAY = 10;
const RANK_SHOW = 10;
const moneyGachaResno = {
    1: "『幸运』看不到你的诚意。（金钱不足）",
    2: "『幸运』今天似乎不会再回应你了。（次数超过每日上限）",
    3: "水声挺好听的——是说你用钱来打水漂的声音。",
    4: "似乎被『幸运』眷顾，你获得了一个珍贵的【特等赏】",
    5: "运气不错，你获得了一个【一等赏】",
    6: "就这？你获得了一个【二等赏】",
    7: "无趣的概率与无趣的结果。你获得了一个【末等赏】",
    8: "不用这笔天降横财试试更好的馈赠吗？你获得了100金钱",
    9: "只有这点根本不够吧？",
    10:"极致的不幸也是一种极致的幸运？",
    11:"你高超的打水漂技术似乎让『幸运』也为之动容，你获得了一个【非酋赏】",
    12:"让我们看看一次抽十连能获得什么——"
};
class Gacha{
    userId;
    ctx;
    money;

    lastMoneyGacha;
    todayMoneyGacha;

    totalMoneyGacha;

    totalNoGainInMoney;
    totalSsrInMoney;

    chainNoGainInMoney;//日清零&获取清零
    noGainInMoneyDays;//七连水漂累计

    constructor(ctx) {
        let gachaInfoAll = JSON.parse(ext.storageGet("gachaInfo") || "{}");
        this.userId = ctx.player.userId;
        this.ctx = ctx;
        this.money = seal.vars.intGet(ctx, `$m金钱`)[0];
        //每天限制次数所需
        this.lastMoneyGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["lastMoneyGacha"] : seal.vars.intGet(ctx, `$m上次金币抽卡`)[0];
        this.todayMoneyGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["todayMoneyGacha"]:seal.vars.intGet(ctx, `$m今日金币抽卡次数`)[0];
        //统计数据
        this.totalMoneyGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["totalMoneyGacha"]:0;
        this.totalNoGainInMoney = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["totalNoGainInMoney"]:0;
        this.totalSsrInMoney = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["totalSsrInMoney"]:0;
        //保底
        this.chainNoGainInMoney = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["chainNoGainInMoney"]:seal.vars.intGet(ctx, `$m今日连续水漂次数`)[0];
        this.noGainInMoneyDays = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["noGainInMoneyDays"]:seal.vars.intGet(ctx, `$m七连水漂`)[0];

    }
    saveMoneyGacha(){
        let gachaInfoAll = JSON.parse(ext.storageGet("gachaInfo") || "{}");
        if (!gachaInfoAll[this.userId]) {
            gachaInfoAll[this.userId] = {};
        }
        gachaInfoAll[this.userId]["name"] = this.ctx.player.name;
        gachaInfoAll[this.userId]["platform"] = this.ctx.endPoint.platform;
        gachaInfoAll[this.userId]["groupId"] = this.ctx.player.groupId;
        gachaInfoAll[this.userId]["lastMoneyGacha"] = this.lastMoneyGacha;
        gachaInfoAll[this.userId]["todayMoneyGacha"] = this.todayMoneyGacha;
        gachaInfoAll[this.userId]["totalMoneyGacha"] = this.totalMoneyGacha;
        gachaInfoAll[this.userId]["totalNoGainInMoney"] = this.totalNoGainInMoney;
        gachaInfoAll[this.userId]["totalSsrInMoney"] = this.totalSsrInMoney;
        gachaInfoAll[this.userId]["chainNoGainInMoney"] = this.chainNoGainInMoney;
        gachaInfoAll[this.userId]["noGainInMoneyDays"] = this.noGainInMoneyDays;
        gachaInfoAll[this.userId]["money"] = this.money;
        seal.vars.intSet(this.ctx, "$m金钱", this.money);
        ext.storageSet("gachaInfo", JSON.stringify(gachaInfoAll));
    }
    
    moneyGachaCore(gainRate){
        let result = getRandomInt(0,100);
        if(result>gainRate){
            this.chainNoGainInMoney++;
            this.totalNoGainInMoney++;
            return moneyGachaResno[3];
        }else{
            this.chainNoGainInMoney=0;
            let gainType = getRandomInt(0,100);
            if(gainType == 100){
                seal.vars.intSet(this.ctx, "$m特等赏", seal.vars.intGet(this.ctx, `$m特等赏`)[0]+1);
                return moneyGachaResno[4];
            }
            if(gainType>=97 && gainType<100){
                seal.vars.intSet(this.ctx, "$m一等赏", seal.vars.intGet(this.ctx, `$m一等赏`)[0]+1);
                return moneyGachaResno[5];
            }
            if(gainType>=93 && gainType<97){
                seal.vars.intSet(this.ctx, "$m二等赏", seal.vars.intGet(this.ctx, `$m二等赏`)[0]+1);
                return moneyGachaResno[6];
            }
            if(gainType>=74 && gainType<93){
                seal.vars.intSet(this.ctx, "$m末等赏", seal.vars.intGet(this.ctx, `$m末等赏`)[0]+1);
                return moneyGachaResno[7];
            }
            if(gainType>=73 && gainType<74){
                this.money+=700;
                return moneyGachaResno[8];
            }
            if(gainType>=0 && gainType<73){
                let gainMoney=getRandomInt(1,10);
                this.money+=gainMoney;
                return moneyGachaResno[9]+`你获得了${gainMoney}金钱。`;
            }
            
        }
    }
    addNoGainInMoneyDays(res){    
        this.noGainInMoneyDays += 1;
        res+=`\f`+moneyGachaResno[10];
        if(this.noGainInMoneyDays%MAX_MONEYGACHA_PERDAY==0){
            seal.vars.intSet(this.ctx, "$m非酋赏", seal.vars.intGet(this.ctx, `$m非酋赏`)[0]+1);
            res+=`\f`+moneyGachaResno[11];
        }
        this.chainNoGainInMoney = 0 ;
        return res;
    }
    multiMoneyGacha(){
        let extraChance = seal.vars.intGet(this.ctx, `$m额外抽卡次数`)[0];
        if(this.money<GACHA_MULTI*MONEY_COST && extraChance<GACHA_MULTI){
            return moneyGachaResno[1];//钱+额外次数不足拦截
        }
        const timestamp = (Date.parse(new Date())/1000);
        if(parseInt((this.lastMoneyGacha+28800)/86400)!=parseInt((timestamp+28800)/86400)){//判断newday 刷新
            this.todayMoneyGacha=0;
            this.chainNoGainInMoney=0;
        }

        if(this.todayMoneyGacha+GACHA_MULTI>MAX_MONEYGACHA_PERDAY && extraChance<GACHA_MULTI){
            return moneyGachaResno[2];//今日抽卡上限+额外次数不足拦截
        }
        //扣除消耗
        if(this.money>=GACHA_MULTI*MONEY_COST && this.todayMoneyGacha+GACHA_MULTI<=MAX_MONEYGACHA_PERDAY){//1*1 钱且没有达到上限 扣钱加次数
            this.todayMoneyGacha+=GACHA_MULTI;
            this.money-=GACHA_MULTI*MONEY_COST;
        }else{
            seal.vars.intSet(this.ctx, "$m额外抽卡次数", extraChance-GACHA_MULTI);
        }
        //开始抽卡流程
        this.totalMoneyGacha += GACHA_MULTI;
        this.lastMoneyGacha = timestamp;
        let luckLevel = CalcLuckLevel(this.ctx);
        let gainRate = GainRate(luckLevel);
        console.log(this.ctx.player.name+`此次抽卡获取率为`+gainRate);
        let resStr = moneyGachaResno[12];
        for(let i=0;i<MAX_MONEYGACHA_PERDAY;i++){
            resStr += `\n`+this.moneyGachaCore(gainRate);
        }
        if(this.chainNoGainInMoney >= MAX_MONEYGACHA_PERDAY){
            resStr = this.addNoGainInMoneyDays(resStr);
        }
        this.saveMoneyGacha();
        return resStr;
    }
    singleMoneyGacha(){
        let extraChance = seal.vars.intGet(this.ctx, `$m额外抽卡次数`)[0];
        if(this.money<MONEY_COST && extraChance<1){
            return moneyGachaResno[1];//钱+额外次数不足拦截
        }
        const timestamp = (Date.parse(new Date())/1000);
        if(parseInt((this.lastMoneyGacha+28800)/86400)!=parseInt((timestamp+28800)/86400)){//判断newday 刷新
            this.todayMoneyGacha=0;
            this.chainNoGainInMoney=0;
        }
        if(this.todayMoneyGacha+1>MAX_MONEYGACHA_PERDAY && extraChance<1){
            return moneyGachaResno[2];//今日抽卡上限+额外次数不足拦截
        }
        //扣除消耗
        if(this.money>=MONEY_COST && this.todayMoneyGacha+1<=MAX_MONEYGACHA_PERDAY){//1*1 钱且没有达到上限 扣钱加次数
            this.todayMoneyGacha+=1;
            this.money-=MONEY_COST;
        }else{
            seal.vars.intSet(this.ctx, "$m额外抽卡次数", extraChance-1);
        }
        //开始抽卡流程
        this.totalMoneyGacha += 1;
        this.lastMoneyGacha = timestamp;
        let luckLevel = CalcLuckLevel(this.ctx);
        let gainRate = GainRate(luckLevel);
        console.log(this.ctx.player.name+`此次抽卡获取率为`+gainRate);
        let resStr = this.moneyGachaCore(gainRate);
        
        if(this.chainNoGainInMoney == MAX_MONEYGACHA_PERDAY){
            resStr = this.addNoGainInMoneyDays(resStr);
        }
        this.saveMoneyGacha();
        return resStr;
    }
}

let ext = seal.ext.find("Shop_wish");
if (!ext) {
    ext = seal.ext.new("Shop_wish", "kakakumous", "1.0.1");
    seal.ext.register(ext);
    ext.onNotCommandReceived = (ctx, msg) => {
        //==========================================================================================抽卡执行
        if(msg.message == '抽一下'){
            let gacha = new Gacha(ctx);
            seal.replyToSender(ctx, msg, gacha.singleMoneyGacha());
            return seal.ext.newCmdExecuteResult(true);
        } 
        if(msg.message == '抽十连'){
            let gacha = new Gacha(ctx);
            seal.replyToSender(ctx, msg, gacha.multiMoneyGacha());
            return seal.ext.newCmdExecuteResult(true);
        }
        //===========================================================================================数据统计
        if(msg.message == '想看一群倒霉蛋'){
            let arr=[];
            let gachaInfoAll = JSON.parse(ext.storageGet("gachaInfo") || "{}");
            let players = Object.keys(gachaInfoAll);
            for(let i = 0 ; i < players.length ; i++){
                let player=players[i];
                if(gachaInfoAll[player]["platform"] !== ctx.endPoint.platform){
                    continue;
                }
                if(gachaInfoAll[player]["name"] === undefined){
                    arr.push([gachaInfoAll[player]["totalNoGainInMoney"], `noname`]);
                    continue;
                }
                arr.push([gachaInfoAll[player]["totalNoGainInMoney"], gachaInfoAll[player]["name"]]);
            }
            arr = descValueArr(arr);
            res = `重磅！打水漂高手榜火热竞争中！快来看看你是否榜上有名吧！\n`;
            for(let i = 0;i < arr.length; i++){
                if(i == RANK_SHOW)break;
                switch(i){
                    case 0: res += `\n🥇`;break;
                    case 1: res += `\n🥈`;break;
                    case 2: res += `\n🥉`;break;
                    default:res += `\n`+(i+1)+`-`;
                }
                res += arr[i][1]+`~`+arr[i][0]+`次`;
            }
            seal.replyToSender(ctx, msg, res);
            return seal.ext.newCmdExecuteResult(true);
        }
        if(msg.message == '想看最倒霉的倒霉蛋'){
            let arr = [];
            let gachaInfoAll = JSON.parse(ext.storageGet("gachaInfo") || "{}");
            let players = Object.keys(gachaInfoAll);
            for(let i = 0 ; i < players.length ; i++){
                let player = players[i];
                if(player === `UI:1001`){
                    arr.push([gachaInfoAll[player]["totalNoGainInMoney"], `【ADMIN】`]);
                    continue;
                }
                if(gachaInfoAll[player]["name"] === undefined){
                    arr.push([gachaInfoAll[player]["totalNoGainInMoney"], `noname`]);
                    continue;
                }
                arr.push([gachaInfoAll[player]["totalNoGainInMoney"], gachaInfoAll[player]["name"]]);
            }
            arr = descValueArr(arr);
            res = `重磅！打水漂高手榜火热竞争中！快来看看你是否榜上有名吧！\n`;
            for(let i = 0;i < arr.length; i++){
                if(i==RANK_SHOW)break;
                switch(i){
                    case 0: res += `\n👸🏿`;break;
                    case 1: res += `\n👸🏾`;break;
                    case 2: res += `\n👸🏽`;break;
                    default:res += `\n`+(i+1)+`-`;
                }
                res += arr[i][1]+`~`+arr[i][0]+`次`;
            }
            seal.replyToSender(ctx, msg, res);
            return seal.ext.newCmdExecuteResult(true);
        }
        if(msg.message == '想看自己的倒霉程度'){
            let gachaInfoAll = JSON.parse(ext.storageGet("gachaInfo") || "{}");
            let gachaInfo = gachaInfoAll[ctx.player.userId];
            if(!gachaInfo){
                seal.replyToSender(ctx, msg, ctx.player.name+`您还没有抽过卡。`);
                return seal.ext.newCmdExecuteResult(true);
            }

            let res = `尊敬的客户<`+gachaInfo.name+`>，您的查询抽卡数据业务回复如下：\n~累计进行抽卡：`+gachaInfo.totalMoneyGacha+`次`;

            res += `\n~累计打水漂`+gachaInfo.totalNoGainInMoney+`次`;
            let realGainrate = gachaInfo.totalNoGainInMoney/gachaInfo.totalMoneyGacha*100;
            res += `\n 水漂率`+realGainrate.toFixed(2)+`%`;

            res += `\n~累计获取特等赏`+gachaInfo.totalSsrInMoney+`个`;
            if(gachaInfo.totalSsrInMoney!=0){
                let realSsrRate = gachaInfo.totalSsrInMoney/gachaInfo.totalMoneyGacha*100;
                res += `\n 特等赏获取率`+realSsrRate.toFixed(4)+`%`;
            }else{
                res += `\n 尚未获得过特等赏。`;
            }
            res += `\n这样就可以了吗？不继续努力的话可是会被拉开距离的哦？`;
            seal.replyToSender(ctx, msg, res);
        }
    }
}

//零散调用

function CalcLuckLevel(ctx){
    let luckLevel=0;
    let jrrp=seal.vars.intGet(ctx, `$t人品`)[0];
    if(jrrp>=90)luckLevel++;
    if(jrrp<10)luckLevel--;

    const timestamp = (Date.parse(new Date())/1000);
    let itemLuckTime=seal.vars.intGet(ctx, `$m道具好运_upTime`)[0];
    let itemLuck=seal.vars.intGet(ctx, `$m道具好运`)[0];
    let itemBadLuckTime=seal.vars.intGet(ctx, `$m道具霉运_upTime`)[0];
    let itemBadLuck=seal.vars.intGet(ctx, `$m道具霉运`)[0];
    if(itemLuckTime>=timestamp)luckLevel+=itemLuck;
    if(itemBadLuckTime>=timestamp)luckLevel+=itemBadLuck;

    return luckLevel;

}
function GainRate(luckLevel){
    switch(luckLevel){
        case 0:return 50;
        case 1:return 75;
        case -1:return 25;
        case 2:return 85;
        case -2:return 15;
        case 3:return 90;
        case -3:return 10;
        case 4:return 93;
        case -4:return 7;
        case 5:return 95;
        case -5:return 5;
        case 6:return 97;
        case -6:return 3;
        case 7:return 99;
        case -7:return 1;
    }
}
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function descValueArr(arr){//行首元素降序
    if(arr.length <= 1){return arr;}
    for (let i = 0; i < arr.length - 1; i++) {
        for (let j = 0; j < arr.length - 1 - i; j++) {
            if (arr[j][0] < arr[j + 1][0]) {
                t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }
    return arr;
}
