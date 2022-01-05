const { ethers } = require("ethers");
const async = require('async')
const puppeteer = require('puppeteer');
const dfkGraph = require('./request');
const { Client, Intents } = require('discord.js');

// Defining the queue
const queue = async.queue(async ({heroId, hero}) => {
    console.log(hero)
    await getAuctionDetail(heroId, hero);
}, 1); // The concurrency value is 1



const provider = new ethers.providers.JsonRpcProvider('https://api.s0.t.hmny.io');
const ABI = [
    'function jewelToekn() view returns (address)',
    'function getAuction(uint256 heroId) view returns (uint256 auctionId, address owner, uint128 minPrice, uint128 maxPrice, uint64 unknown, uint256 startedAt)',
    'function isOnAuction(uint256 heroId) view returns (bool)',
    'function getCurrentPrice(uint256) view returns (uint256)',
    'function getUserAuctions(address) view',
    'function name() view returns (string)',
]
const marketContract = new ethers.Contract('0x13a65b9f8039e2c032bc022171dc05b30c3f2892', ABI, provider);


const DISCORD_KEY = '';
const CHANNEL_ID = '';
const client = new Client({intents: [Intents.FLAGS.GUILDS]});

let channel, page;

const run = async () => {
    const browser = await puppeteer.launch({})
    page = await browser.newPage()

    provider.on({
        address: '0x13a65b9f8039e2c032bc022171dc05b30c3f2892',
        topics: ['0x9a33d4a1b0a13cd8ff614a080df31b4b20c845e5cde181e3ae6f818f62b6ddde']
    }, async (log, event) => {
        const heroId = ethers.BigNumber.from(log.topics[2]).toString();
        const hero = await dfkGraph.getHero(parseInt(heroId)).catch(console.log);
        

        queue.push({heroId, hero})
    })

}

const log = (prevText, text) => {
    console.log(text);
    return prevText + '\n' + text;
}

const getAuctionDetail = async (heroId, hero) => {
    const isAuction = await marketContract.isOnAuction(heroId)
    if(isAuction) {
        let discordText = '';
        try {
            await page.goto('https://kingdom.watch/hero/' + heroId);
            await page.waitForSelector('div#app > div.container > div.row > div.col-sm-12.col-md-6.col-lg-3 > p.text-start > strong');
            await page.waitForSelector('tr.table-success td');
            var floorPrice = await page.$('div#app > div.container > div.row > div.col-sm-12.col-md-6.col-lg-3 > p.text-start > strong');
            var profession = await page.$$('tr.table-success td');
            var R1gene = await page.$('.col-sm-12.col-md-6.col-lg-4 tbody .text-end');
            var highestProfession = await page.evaluate(element => element.textContent, profession[0]);
            var score = await page.evaluate(element => element.textContent, profession[1]);
            var text = await page.evaluate(element => element.textContent, floorPrice)
            var mainR1Gene = await page.evaluate(element => element.textContent, R1gene)
            if(/*mainR1Gene == hero.mainClass && hero.generation == 1 && */hero.summons <= 1) {
                discordText = log(discordText, 'Suggest price: ' + text)
                discordText = log(discordText, 'Profession: ' + highestProfession)
                discordText = log(discordText, 'Main R1 Gene: ' + mainR1Gene)
                discordText = log(discordText, 'Score: ' + score)
            }
        } catch(e) {
            console.log(e)
            console.log('Cannot get suggested price')
        }

        try {
            const auction = await marketContract.getAuction(heroId)
            var p = hero.statBoost1;
            var s = hero.statBoost2;
            if(/*mainR1Gene == hero.mainClass && hero.generation == 1 && */hero.summons <= 1) {
                discordText = log(discordText, 'Tavern price: ' + hero.saleAuction?.startingPrice.slice(0, -18))
                discordText = log(discordText, `Id: ${heroId} @ ${ethers.utils.formatEther(auction.minPrice)} - ${auction.maxPrice.toString()}`)
                discordText = log(discordText, `${hero.statBoost1} , ${hero.statBoost2} , ${hero.mainClass}/${hero.subClass} , ${hero.profession} , ${hero.rarity}, ${hero.summons}`)
            }
        } catch(e) {
            console.log(e);
            console.log('Cannot get auction.')
        }
        if(discordText != '') {    
            channel.send(discordText)
        }
        console.log('-------------------------------------------')
    }
}

client.once('ready', () => {
    channel = client.channels.cache.get(CHANNEL_ID);
    run();
});

client.login(DISCORD_KEY);