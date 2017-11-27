const Twitter = require('twitter');
const phantom = require('phantom');
const https = require("https");
const http = require("http");

// Gerekli apii bilgisi alınıyor...
const TwitterConfig = {
    consumer_key: process.env.LEGALBOT_TWITTER_CONSUMER_KEY || '',
    consumer_secret: process.env.LEGALBOT_TWITTER_CONSUMER_SECRET || '',
    access_token_key: process.env.LEGALBOT_TWITTER_TOKEN_KEY || '',
    access_token_secret: process.env.LEGALBOT_TWITTER_TOKEN_SECRET || ''
};

// API bilgisi yoksa boşuna uğraştırmıyorum ve komple hata döndürüyorum. API bilgisi olmayan bot, bot değildir.
if (!TwitterConfig.consumer_key) throw new Error("Twitter consumer key not found!")
if (!TwitterConfig.consumer_secret) throw new Error("Twitter consumer secret not found!")
if (!TwitterConfig.access_token_key) throw new Error("Twitter access token key not found!")
if (!TwitterConfig.access_token_secret) throw new Error("Twitter access token secret not found!")
const client = new Twitter(TwitterConfig);
function findAndShare() {
    // Tarihi aliyorum

    return new Promise((resolve, reject) => {
        const date = new Date();
        // Gunde sadece 1 kere paylasilacak. Bundan dolayi saate bakiyorum.
        if (date.getHours() != 9) return resolve({ok : true});
        const year = date.getFullYear();
        const month = (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1);
        const day = date.getDate();

        // Tarihe bakarak url i olusturuyorum.
        const url = `http://www.resmigazete.gov.tr/eskiler/${year}/${month}/${year}${month}${day}.htm`;

        // Hayatimda hic phantomjs kullanmadim. Bundan dolayi verilmis ornegi direkt kopyalayip isime gelicek sekilde duzelttim. 
        phantom.create().then(ph => {
            ph.createPage().then(page => {
                page.open(url).then(status => {
                    page.evaluate(function () {
                        var result = []
                        var resmiGazeteSonuclari = document.querySelectorAll("#AutoNumber1 tbody tr td .MsoNormal a");
                        for (var i = 0; i < resmiGazeteSonuclari.length; i++) {
                            var title = resmiGazeteSonuclari[i].innerText;
                            var href = resmiGazeteSonuclari[i].href
                            if (title && href) {
                                result.push({
                                    title: title,
                                    href: href,
                                    shared: false
                                })
                            }
                        }
                        return result
                    }).then(results => {
                        console.log(`results a girdi`)
                        const shareList = results;
                        const timer = setInterval(_ => {
                            console.log(`setinterval calismaya basladi`)
                            for (let i = 0; i < shareList.length; i++) {
                                if (shareList[i].shared) {
                                    continue;
                                }
                                client.post('statuses/update', {
                                    status: shareList[i].title + " " + shareList[i].href
                                }).then(function (tweet) {
                                    resolve("Tweet paylaşıldı, ")
                                }).catch(function (error) {
                                    reject(error)
                                })
                                shareList[i].shared = true;
                                if(shareList.length == i) return clearInterval(timer);
                                break;
                            }
                        }, 1800000)
                        ph.exit();
                    }).catch(err => {
                        reject(err)
                        ph.exit();
                    })
                }).catch(err => {
                    reject(err)
                    ph.exit();
                })
            }).catch(err => {
                reject(err)
                ph.exit();
            })
        }).catch(err => {
            reject(err)
        })
    })
}

setInterval(_ => {
    findAndShare().then(results=>{
        console.log(results)
    }).catch(err=>{
        console.log(err)
    })
}, 3000000)