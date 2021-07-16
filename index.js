const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const Web3 = require("web3")
const fetch = require("node-fetch")
const secrets = require("../secrets.json")

const app = express();
const port = 8088

const go = async () => {
    app.use(helmet());
    app.use(bodyParser.json());
    app.use((req, res, next) => {
        res.header(
            "Access-Control-Allow-Origin",
            "*"
        );
        res.header("Access-Control-Allow-Headers", "Content-Type");
        next();
    });

    const router = express.Router();
    // const providerUrl = "http://39.102.101.142:8545"
    // const providerUrl = "http://127.0.0.1:8545"
    // const providerUrl = "https://mainnet.infura.io/v3/" // metamask
    const providerUrl = "https://rinkeby.infura.io/v3/" + secrets.projectId // metamask


    const provider = new Web3.providers.HttpProvider(providerUrl, {timeout: 10e3})
    let web3 = new Web3(provider)

    let accounts = []

    let account1 = web3.eth.accounts.wallet.add(secrets.privateKeys[0])
    accounts.push(account1.address)
    let account2 = web3.eth.accounts.wallet.add(secrets.privateKeys[1])
    accounts.push(account2.address)
    let account3 = web3.eth.accounts.wallet.add(secrets.privateKeys[2])
    accounts.push(account3.address)

    let methods = [
        "eth_getBalance",
        "eth_accounts",
        "eth_blockNumber",
        "eth_getBlockByNumber",
        "net_version",
        "eth_call",
        "eth_getTransactionReceipt"
    ]
    router.all("", async (req, res) => {
        if (req.method == "OPTIONS") {
            res.json()
        }

        if (req.method == "POST") {
            if (req.body.jsonrpc == "2.0") {
                let rpc = JSON.stringify(req.body)

                if (req.body.method === "eth_sendTransaction") {
                    let params = req.body.params[0]
                    let singData = await web3.eth.accounts.signTransaction(params, web3.eth.accounts.wallet[params.from].privateKey)
                    await web3.eth.sendSignedTransaction(singData.rawTransaction)
                    return res.json({jsonrpc: '2.0', id: req.body.id, result: singData.transactionHash})
                }

                const result = await fetch(providerUrl, {
                    method: 'post',
                    body: rpc,
                    headers: {'Content-Type': 'application/json'},
                })
                let foo = await result.json()
                if (!methods.includes(req.body.method)) {
                    console.log(req.body.method, foo)
                    if (req.body.method === "eth_blockNumber"
                        || req.body.method === "eth_chainId"
                        || req.body.method === "eth_gasPrice") {
                        console.log(req.body.method, foo.id, parseInt(foo.result))
                    }
                }
                if (req.body.method === "eth_accounts") {
                    foo.result = accounts
                }
                res.json(foo)
            }
        }
    });

    app.use("", (req, res, next) => {
        if (!methods.includes(req.body.method) && req.method === "POST") {
            console.log(req.method + "," + req.url + ", rpc:" + JSON.stringify(req.body))
        }
        next();
    }, router);
    app.listen(port, () => {
        console.info("Listening on port " + port);
    });
};

go()