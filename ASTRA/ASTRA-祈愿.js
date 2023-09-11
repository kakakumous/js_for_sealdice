// ==UserScript==
// @name         ASTRA-祈愿
// @author       kakakumous
// @version      1.0.1
// @description  单抽：祈求七月之力 七连：祈求银辉七月之力 想看自己的倒霉程度 想看一群倒霉蛋 想看最倒霉的倒霉蛋|*祈求魔星之力 祈求粉晶魔星之力
// @timestamp    1693125392
// 2023-08-27 16:36:32
// @license      CC-BY-NC-SA 4.0
// @homepageURL  https://github.com/kakakumous/js_for_sealdice
// ==/UserScript==
const MONEY_COST = 7;
const GACHA_MULTI = 7;
const MAX_MONEYGACHA_PERDAY = 7;
const RANK_SHOW = 7;
const moneyGachaResno = {
    1: "你的祈求之力太微弱了，『幸运』看不到你的诚意，无法给予你回应。",
    2: "祈求的力量已经黯淡，『幸运』今天似乎不会再回应你了。",
    3: "水声挺好听的——我是说你用钱来打水漂的声音，不是指你大脑中晃动的水声哦。",
    4: "似乎被『幸运』眷顾了，不趁机再祈求一次吗？你获得了一个珍贵的【银辉馈赠】",
    5: "算获得更深更好的卡池的入场券了，对于你来说还真是不可思议呢。",
    6: "就你这点能力，也用不上那些东西吧，不如用卖它们的钱再祈求一次呢？你获得了一个【七月装备箱】",
    7: "无趣的概率与无趣的结果。你应该会追求更刺激的祈求吧？你获得了一个【七月道具箱】",
    8: "这就是你的极限吗？不用这笔天降横财试试更好的馈赠吗？你获得了700月光币",
    9: "只有这点根本不够吧，不用来试试更好的奖励吗？",
    10:"极致的不幸也是一种极致的幸运，别灰心打水漂冠军，不如换个池子试试手气？",
    11:"你高超的打水漂技术似乎让『幸运』也为之动容，祂愿意回赠予你一个特别的小礼物。你获得了一个【过盈回赠】",
    12:"7是奥斯塔拉最幸运的数字，但是它一定会给你带来好运吗？"
};
class Gacha{
    userId;
    ctx;
    money;
    crystal;

    lastMoneyGacha;
    lastCrystalGacha;

    todayMoneyGacha;
    todayCrystalGacha;

    totalMoneyGacha;
    totalCrystalGacha;

    totalNoGainInMoney;

    chainNoGainInMoney;//日清零&获取清零
    chainNoRareInCrystal;//获取清零

    noGainInMoneyDays;

    constructor(ctx) {
        let gachaInfoAll = JSON.parse(ext.storageGet("gachaInfo") || "{}");
        this.userId = ctx.player.userId;
        this.ctx = ctx;
        this.money = seal.vars.intGet(ctx, `$m月光币`)[0];
        this.crystal = seal.vars.intGet(ctx, `$m魔力水晶`)[0];
        //每天限制次数所需
        this.lastMoneyGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["lastMoneyGacha"] : seal.vars.intGet(ctx, `$m上次金币抽卡`)[0];
        this.lastCrystalGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["lastCrystalGacha"]:0;
        this.todayMoneyGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["todayMoneyGacha"]:seal.vars.intGet(ctx, `$m今日金币抽卡次数`)[0];
        this.todayCrystalGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["todayCrystalGacha"]:0;
        //统计数据
        this.totalMoneyGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["totalMoneyGacha"]:0;
        this.totalCrystalGacha = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["totalCrystalGacha"]:0;
        this.totalNoGainInMoney = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["totalNoGainInMoney"]:seal.vars.intGet(ctx, `$m水漂累计`)[0];
        //保底
        this.chainNoGainInMoney = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["chainNoGainInMoney"]:seal.vars.intGet(ctx, `$m今日连续水漂次数`)[0];
        this.chainNoRareInCrystal = gachaInfoAll[this.userId] ? gachaInfoAll[this.userId]["chainNoRareInCrystal"]:0;
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
        gachaInfoAll[this.userId]["chainNoGainInMoney"] = this.chainNoGainInMoney;
        gachaInfoAll[this.userId]["noGainInMoneyDays"] = this.noGainInMoneyDays;
        gachaInfoAll[this.userId]["money"] = this.money;
        seal.vars.intSet(this.ctx, "$m月光币", this.money);
        gachaInfoAll[this.userId]["crystal"] = this.crystal;
        seal.vars.intSet(this.ctx, "$m魔力水晶", this.crystal);
        ext.storageSet("gachaInfo", JSON.stringify(gachaInfoAll));
    }
    saveCrystalGacha(){
        let gachaInfoAll = JSON.parse(ext.storageGet("gachaInfo") || "{}");
        if (!gachaInfoAll[this.userId]) {
            gachaInfoAll[this.userId] = {};
        }
        gachaInfoAll[this.userId]["lastCrystalGacha"] = this.lastCrystalGacha;
        gachaInfoAll[this.userId]["todayCrystalGacha"] = this.todayCrystalGacha;
        gachaInfoAll[this.userId]["totalCrystalGacha"] = this.totalCrystalGacha;
        gachaInfoAll[this.userId]["chainNoGainInCrystal"] = this.chainNoGainInCrystal;
        gachaInfoAll[this.userId]["crystal"] = this.crystal;
        seal.vars.intSet(this.ctx, "$m魔力水晶", this.crystal);
        ext.storageSet("gachaInfo", JSON.stringify(gachaInfoAll));
    }
    moneyGachaCore(gainRate){
        let result = getRandomInt(0,100);
        if(result<gainRate){
            this.chainNoGainInMoney++;
            this.totalNoGainInMoney++;
            return moneyGachaResno[3];
        }else{
            this.chainNoGainInMoney=0;
            let gainType = getRandomInt(0,100);
            if(gainType == 100){
                seal.vars.intSet(this.ctx, "$m银辉馈赠", seal.vars.intGet(this.ctx, `$m银辉馈赠`)[0]+1);
                return moneyGachaResno[4];
            }
            if(gainType>=97 && gainType<100){
                let gainCrystal = getRandomInt(1,3);
                this.crystal+=gainCrystal;
                return moneyGachaResno[5]+`你获得了${gainCrystal}个魔力水晶。`;
            }
            if(gainType>=93 && gainType<97){
                seal.vars.intSet(this.ctx, "$m七月装备箱", seal.vars.intGet(this.ctx, `$m七月装备箱`)[0]+1);
                return moneyGachaResno[6];
            }
            if(gainType>=74 && gainType<93){
                seal.vars.intSet(this.ctx, "$m七月道具箱", seal.vars.intGet(this.ctx, `$m七月道具箱`)[0]+1);
                return moneyGachaResno[7];
            }
            if(gainType>=73 && gainType<74){
                this.money+=700;
                return moneyGachaResno[8];
            }
            if(gainType>=0 && gainType<73){
                let gainMoney=getRandomInt(1,10);
                this.money+=gainMoney;
                return moneyGachaResno[9]+`你获得了${gainMoney}月光币。`;
            }
            
        }
    }
    addNoGainInMoneyDays(res){    
        this.noGainInMoneyDays+=1;
        res+=`\f`+moneyGachaResno[10];
        if(this.noGainInMoneyDays%MAX_MONEYGACHA_PERDAY==0){
            seal.vars.intSet(this.ctx, "$m过盈回赠", seal.vars.intGet(this.ctx, `$m过盈回赠`)[0]+1);
            res+=`\f`+moneyGachaResno[11];
        }
        return res;
    }
    multiMoneyGacha(){
        let extraChance = seal.vars.intGet(this.ctx, `$m月光币抽卡次数`)[0];
        if(this.money<GACHA_MULTI*MONEY_COST && extraChance<GACHA_MULTI){
            return moneyGachaResno[1];//钱+额外次数不足拦截
        }
        const timestamp = (Date.parse(new Date())/1000);
        if(parseInt((this.lastMoneyGacha+28800)/86400)!=parseInt((timestamp+28800)/86400)){//判断newday
            this.todayMoneyGacha=GACHA_MULTI;
            this.chainNoGainInMoney=0;
        }else{
            this.todayMoneyGacha+=GACHA_MULTI;
        }
        if(this.todayMoneyGacha>MAX_MONEYGACHA_PERDAY&&extraChance<GACHA_MULTI){
            return moneyGachaResno[2];//今日抽卡上限+额外次数不足拦截
        }
        
        //扣除消耗
        if(this.money<GACHA_MULTI*MONEY_COST){
            seal.vars.intSet(this.ctx, "$m月光币抽卡次数", extraChance-GACHA_MULTI);
        }else{
            this.money -= GACHA_MULTI*MONEY_COST;
        }
        this.totalMoneyGacha += GACHA_MULTI;
        //开始抽卡流程
        this.lastMoneyGacha = timestamp;
        let luckLevel = CalcLuckLevel(this.ctx);
        let gainRate = GainRate(luckLevel);
        console.log(this.ctx.player.name+`此次抽卡获取率为`+gainRate);
        let resStr = moneyGachaResno[12];
        for(let i=0;i<MAX_MONEYGACHA_PERDAY;i++){
            resStr += `\n`+this.moneyGachaCore(gainRate);
        }
        if(this.chainNoGainInMoney == MAX_MONEYGACHA_PERDAY){
            resStr = this.addNoGainInMoneyDays(resStr);
        }
        this.saveMoneyGacha();
        return resStr;
    }
    singleMoneyGacha(){
        let extraChance = seal.vars.intGet(this.ctx, `$m月光币抽卡次数`)[0];
        if(this.money<MONEY_COST && extraChance<1){
            return moneyGachaResno[1];//钱+额外次数不足拦截
        }
        const timestamp = (Date.parse(new Date())/1000);
        if(parseInt((this.lastMoneyGacha+28800)/86400)!=parseInt((timestamp+28800)/86400)){//判断newday
            this.todayMoneyGacha=1;
            this.chainNoGainInMoney=0;
        }else{
            this.todayMoneyGacha+=1;
        }
        if(this.todayMoneyGacha>MAX_MONEYGACHA_PERDAY&&extraChance<1){
            return moneyGachaResno[2];//今日抽卡上限+额外次数不足拦截
        }
        
        //扣除消耗
        if(this.money<GACHA_MULTI*MONEY_COST){
            seal.vars.intSet(this.ctx, "$m月光币抽卡次数", extraChance-1);
        }else{
            this.money -= MONEY_COST;
        }
        this.totalMoneyGacha += 1;
        //开始抽卡流程
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

let ext = seal.ext.find("Astra_wish");
if (!ext) {
    ext = seal.ext.new("Astra_wish", "kakakumous", "1.0.1");
    seal.ext.register(ext);
    ext.onNotCommandReceived = (ctx, msg) => {
        //==========================================================================================抽卡执行
        if(msg.message == '祈求七月之力'){
            let gacha = new Gacha(ctx);
            seal.replyToSender(ctx, msg, gacha.singleMoneyGacha());
            return seal.ext.newCmdExecuteResult(true);
        } 
        if(msg.message == '祈求银辉七月之力'){
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
                    arr.push([gachaInfoAll[player]["totalNoGainInMoney"], `无名冒险者`]);
                    continue;
                }
                arr.push([gachaInfoAll[player]["totalNoGainInMoney"], gachaInfoAll[player]["name"]]);
            }
            arr = descValueArr(arr);
            res = `重磅！打水漂高手榜火热竞争中！快来看看你是否榜上有名吧！\n小贴士：高分者可以获得精美小礼品一份哦！快快踊跃参与吧！`;
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
                    arr.push([gachaInfoAll[player]["totalNoGainInMoney"], `【非玩家】测试终端`]);
                    continue;
                }
                if(gachaInfoAll[player]["name"] === undefined){
                    arr.push([gachaInfoAll[player]["totalNoGainInMoney"], `无名冒险者`]);
                    continue;
                }
                arr.push([gachaInfoAll[player]["totalNoGainInMoney"], gachaInfoAll[player]["name"]]);
            }
            arr = descValueArr(arr);
            res = `重磅！打水漂高手榜火热竞争中！快来看看你是否榜上有名吧！\n小贴士：高分者可以获得精美小礼品一份哦！快快踊跃参与吧！`;
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
                seal.replyToSender(ctx, msg, ctx.player.name+`还没有使用月光币进行祈求过。`);
                return seal.ext.newCmdExecuteResult(true);
            }
            res = `尊敬的客户<`+gachaInfo.name+`>，您的查询七月获取统计业务回复如下：\n~水漂/祈愿数：`+gachaInfo.totalNoGainInMoney+`/`+gachaInfo.totalMoneyGacha;
            let rate = gachaInfo.totalNoGainInMoney/gachaInfo.totalMoneyGacha*100;
            res += `\n~水漂率`+rate.toFixed(2)+`%`;
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