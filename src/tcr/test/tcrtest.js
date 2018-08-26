import test from 'ava';
import * as bdb from '../bdb/bdb';
import * as bootstrap from '../lib/bootstrap';
import * as token from '../lib/token';

require('dotenv').config();

test('should-init', async t => {
    const namespace = "testtcr";
    const tokenSymbol = "TST";
    const tcr = await bootstrap.init(namespace, tokenSymbol);
    console.log(JSON.stringify(tcr));
    t.is(tcr.tcrTx.asset.data.namespace, namespace);
});

test('should-transfer-tokens', async t => {
    const tcrPassphrase = process.env.TCR_ADMIN_PASSPHRASE.toString();
    const toPassphrase = bdb.createNewPassphrase();
    const toPublicKey = bdb.getKeypairFromPassphrase(toPassphrase).publicKey;
    const amount = 1000;
    const trTx = await token.transfer(tcrPassphrase, toPublicKey, process.env.TOKEN_ASSET_ID.toString(), amount);
    console.log(JSON.stringify(trTx));
    t.not(trTx.id, undefined);
    t.is(trTx.outputs[0].amount, amount.toString())
    t.is(trTx.outputs[0].public_keys[0], toPublicKey)
});

test('should-fail-transfer-low-balance', async t => {
    const tcrPassphrase = process.env.TCR_ADMIN_PASSPHRASE.toString();
    const toPassphrase = bdb.createNewPassphrase();
    const toPublicKey = bdb.getKeypairFromPassphrase(toPassphrase).publicKey;
    const amount = 21000001; //more than the default total supply of tokens
    try{
        await token.transfer(
            tcrPassphrase, toPublicKey, process.env.TOKEN_ASSET_ID.toString(), amount);
    }
    catch(err){
        console.log(err.message);
        t.is(err.message, 'Transfer failed. Not enough token balance!');
    }
});