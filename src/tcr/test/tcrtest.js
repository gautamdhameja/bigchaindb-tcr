import test from 'ava';
import * as bdb from '../bdb/bdb';
import * as bootstrap from '../lib/bootstrap';
import * as token from '../lib/token';

require('dotenv').config();

async function initTcr(passphrase) {
    const namespace = "testtcr";
    const tokenSymbol = "TST";
    return await bootstrap.init(passphrase, namespace, tokenSymbol);
}

test('should-init', async t => {
    const passphrase = bdb.createNewPassphrase();
    const tcr = await initTcr(passphrase);
    console.log(JSON.stringify(tcr));
    t.is(tcr.asset.data.namespace, "testtcr");
});

test('should-transfer-tokens', async t => {
    const tcrPassphrase = bdb.createNewPassphrase();
    const toPassphrase = bdb.createNewPassphrase();
    const toPublicKey = bdb.getKeypairFromPassphrase(toPassphrase).publicKey;
    const tcr = await initTcr(tcrPassphrase);
    const amount = 1000;
    const trTx = await token.transfer(tcrPassphrase, toPublicKey, tcr.asset.data.tokenAsset, amount);
    console.log(JSON.stringify(trTx));
    t.not(trTx.id, undefined);
    t.is(trTx.outputs[0].amount, amount.toString())
    t.is(trTx.outputs[0].public_keys[0], toPublicKey)
});

test('should-fail-transfer-low-balance', async t => {
    const tcrPassphrase = bdb.createNewPassphrase();
    const toPassphrase = bdb.createNewPassphrase();
    const toPublicKey = bdb.getKeypairFromPassphrase(toPassphrase).publicKey;
    const tcr = await initTcr(tcrPassphrase);
    const amount = 21000001; //more than the default total supply of tokens
    try{
        await token.transfer(tcrPassphrase, 
            toPublicKey, tcr.asset.data.tokenAsset, amount);
    }
    catch(err){
        console.log(err.message);
        t.is(err.message, 'Transfer failed. Not enough token balance!');
    }
});