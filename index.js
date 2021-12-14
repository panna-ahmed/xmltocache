const { XMLParser } = require('fast-xml-parser');
const { promisify } = require('util');
const fs = require('fs');
const redis = require('redis');

var args = process.argv.slice(2);

//read xml
let path = args.includes('-v') ? args[1] : args[0];
let xmlDataStr = fs.readFileSync(path, "utf8");
const options = {
    ignoreAttributes: false,
    attributeNamePrefix : "@_"
};

//parse xml
const jObj  = new XMLParser(options).parse(xmlDataStr);
const { subdomains, cookies } = jObj?.config;

const runApplication = async () => {
    //connect to redis
    const client = redis.createClient({ 
        host: 'redis-server',
        port: 6379 
    });
    client.on('connect',()=>{
        console.log("redis connected")
    });
    client.on('error', err => {
        console.log('Error ' + err);
    });

    const setAsync = promisify(client.set).bind(client);
    const getAsync = promisify(client.get).bind(client);    

    //set cache
    await setAsync('subdomains', JSON.stringify(subdomains?.subdomain));
    cookies.cookie.forEach(async (element, index) => {
        await setAsync(`cookie:${element['@_name']}:${element['@_host']}`, element['#text']);
    });

    if(args.includes('-v')){
        client.keys("*", function(err, replies) {
            replies.forEach(function(reply, index) {
                console.log(reply.toString());
            });
        });
    }
};

runApplication();