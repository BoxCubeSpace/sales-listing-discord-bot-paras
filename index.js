const basePath = process.cwd();
const fs = require("fs");
const axios = require("axios");
const moment = require("moment");
const figlet = require("figlet");
const { XMLHttpRequest } = require("xmlhttprequest");
var request = require("request");
require("dotenv").config();

const pollingInterval = 5000; // ms

var latestListPosted = "",
  latestSalePosted = "",
  floorPrice = "",
  totalVolume;
var nearCurrent = 0;
var options = {
  method: "GET",
  url: `https://api-v2-mainnet.paras.id/activities?contract_id=rocketbois.neartopia.near&type=resolve_purchase&__limit=1`,
};
var options2 = {
  method: "GET",
  url: `https://api-v2-mainnet.paras.id/activities?contract_id=rocketbois.neartopia.near&type=add_market_data&__limit=1`,
};

axios
  .get(
    "https://api-v2-mainnet.paras.id/collection-stats?collection_id=rocketbois.neartopia.near"
  )
  .then((res) => {
    // console.log(res);
    floorPrice = res.data.data.results.floor_price;
    totalVolume = res.data.data.results.volume;
  })
  .catch((err) => {
    console.log(err);
  });

axios
  .get(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=near`
  )
  .then((res) => {
    // If we got a valid response
    if (res.data && res.data[0].current_price) {
      nearCurrent = res.data[0].current_price || 0;
    } else console.log("Could not load player count data");
  })
  .catch((err) => console.log("Error at api.coingecko.com data:", err));

function format(data) {
  return Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(data / 1e24);
}

async function postSalesData(obj) {
  if (obj.title != latestSalePosted) {
    await axios.post(
      process.env.DISCORD_WEBHOOK_SALE,
      {
        embeds: [obj],
      }
    );

    latestSalePosted = obj.title;
  }
}

async function postListsData(obj) {
  if (obj.title != latestListPosted) {
    await axios.post(
      process.env.DISCORD_WEBHOOK_LIST,
      {
        embeds: [obj],
      }
    );

    latestListPosted = obj.title;
  }
}

async function getNewestLists() {
  request(options2, async function (error, response) {
    if (error) {
      console.log(error);
      return;
    }

    let dataList = "";
    fs.readFile("./list-log.json", (err, data) => {
      if (err) console.log(err);
      else {
        var json = JSON.parse(data);
        dataList = json;
      }
    });
    const info = JSON.parse(response?.body);
    if (dataList === info.data.results[0].msg.receipt_id) {
      console.log("Searching newest list...");
    } else {
      try {
        // =========================== VARIABLE ===========================
        let obj = {};
        var media = "";
        const info = JSON.parse(response?.body);
        var d = info.data.results[0].msg.datetime.substr(0, 16);
        var f = moment(d).format("D MMM YYYY, h:mm:ss A");
        var price = info.data.results[0].price.$numberDecimal;
        var token_id_string = info.data.results[0].token_id;
        var seller = info.data.results[0].msg.params.owner_id;
        var tokenId = parseInt(token_id_string);

        axios
          .get(
            `https://api-v2-mainnet.paras.id/token/rocketbois.neartopia.near::${tokenId}`
          )
          .then((res) => {
            media = res.data.metadata.media;
          })
          .catch((err) => {
            console.log(err);
          });

        // =========================== METADATA ===========================
        obj["title"] = `RocketBois #${tokenId} → LISTED`;
        obj[
          "url"
        ] = `https://paras.id/token/rocketbois.neartopia.near::${tokenId}`;
        obj["author"] = {
          name: `PARAS.ID`,
          icon_url: `https://paras-cdn.imgix.net/QmRY9zZdr1aYDT7221VvWytnvUwMZqw27HTc6BTYvXVu4J?w=300&auto=format,compress`,
          url: `https://paras.id/`,
        };
        obj["image"] = {
          url: `${media}`,
        };
        obj["fields"] = [];
        obj["fields"].push({
          name: "💵Price",
          value: `${format(price)}Ⓝ  *($${(nearCurrent * format(price)).toFixed(
            2
          )})*`,
          inline: false,
        });
        obj["fields"].push({
          name: "💰Seller",
          value: `[${seller}](https://paras.id/${seller}/collectibles)`,
          inline: false,
        });
        obj["fields"].push({
          name: "Listed at",
          value: `${f}`,
          inline: false,
        });
        obj["footer"] = {
          text: `Made by BoxCube.`,
          icon_url: `https://firebasestorage.googleapis.com/v0/b/boxcube-33f6d.appspot.com/o/boxcube%2FBOXCUBE.png?alt=media&token=b008e005-c91b-4852-92a8-3eaba8cb2d73`,
        };

        console.log(obj);

        await postListsData(obj);

        fs.writeFileSync(
          `${basePath}/list-log.json`,
          JSON.stringify(info.data.results[0].msg.receipt_id, null, 2)
        );
      } catch (err) {
        console.log(err);
      }
    }
  });
}

async function getNewestSales() {
  request(options, async function (error, response) {
    if (error) {
      console.log(error);
      return;
    }

    let dataSales = "";
    fs.readFile("./sales-log.json", (err, data) => {
      if (err) console.log(err);
      else {
        var json = JSON.parse(data);
        dataSales = json;
      }
    });
    const info = JSON.parse(response?.body);
    if (dataSales === info.data.results[0].msg.receipt_id) {
      console.log("Searching newest sales...");
    } else {
      try {
        // =========================== VARIABLE ===========================
        let obj = {};
        var media = "";
        const info = JSON.parse(response?.body);
        var d = info.data.results[0].msg.datetime.substr(0, 16);
        var f = moment(d).format("D MMM YYYY, h:mm:ss A");
        var from = info.data.results[0].from;
        var to = info.data.results[0].to;
        var price = info.data.results[0].price.$numberDecimal;
        var token_id_string = info.data.results[0].token_id;
        var tokenId = parseInt(token_id_string);

        axios
          .get(
            `https://api-v2-mainnet.paras.id/token/rocketbois.neartopia.near::${tokenId}`
          )
          .then((res) => {
            media = res.data.metadata.media;
          })
          .catch((err) => {
            console.log(err);
          });

        // =========================== METADATA ===========================
        obj["title"] = `RocketBois #${tokenId} → SOLD`;
        obj[
          "url"
        ] = `https://paras.id/token/rocketbois.neartopia.near::${tokenId}`;
        obj["author"] = {
          name: `PARAS.ID`,
          icon_url: `https://paras-cdn.imgix.net/QmRY9zZdr1aYDT7221VvWytnvUwMZqw27HTc6BTYvXVu4J?w=300&auto=format,compress`,
          url: `https://paras.id/`,
        };
        obj["image"] = {
          url: `${media}`,
        };
        obj["description"] = `**💵Price** : ${format(price)}Ⓝ *($${(
          nearCurrent * format(price)
        ).toFixed(2)})*

        **🧹Floor Price** : ${format(floorPrice)}Ⓝ
        
        **💎Total Volume** : ${format(totalVolume)}Ⓝ`;
        obj["fields"] = [];
        obj["fields"].push({
          name: "Transaction",
          value: `💰**Seller** : [${from}](https://paras.id/${from}/collectibles)
          🛒**Buyer** : [${to}](https://paras.id/${to}/collectibles)`,
          inline: false,
        });
        obj["fields"].push({
          name: "Sold at",
          value: `${f}`,
          inline: false,
        });
        obj["footer"] = {
          text: `Made by BoxCube.`,
          icon_url: `https://firebasestorage.googleapis.com/v0/b/boxcube-33f6d.appspot.com/o/boxcube%2FBOXCUBE.png?alt=media&token=b008e005-c91b-4852-92a8-3eaba8cb2d73`,
        };

        await postSalesData(obj);

        fs.writeFileSync(
          `${basePath}/sales-log.json`,
          JSON.stringify(info.data.results[0].msg.receipt_id, null, 2)
        );
      } catch (err) {
        console.log(err);
      }
    }
  });
}

const main = async () => {
  figlet("BOXCUBE BOT START!", function (err, data) {
    if (err) {
      console.log("Something went wrong...");
      console.dir(err);
      return;
    }
    console.log(data);
    console.log("Waiting...");
  });
  setInterval(async () => {
    getNewestSales();
    getNewestLists();
  }, pollingInterval);
};

main();
