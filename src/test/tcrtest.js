import test from 'ava';
import * as bdb from '../shared/bdb';
import * as helper from './_helper';
import * as token from '../lib/token';
import * as config from '../lib/config';

require('dotenv').config();

test('should-init', async t => {
    const passphrase = bdb.createNewPassphrase();
    const tcr = await helper.initTcr(passphrase);
    t.is(tcr.asset.data.namespace, "testtcr");
});

test('should-transfer-tokens', async t => {
    const tcrPassphrase = bdb.createNewPassphrase();
    const toPassphrase = bdb.createNewPassphrase();
    const toPublicKey = bdb.getKeypairFromPassphrase(toPassphrase).publicKey;
    const tcr = await helper.initTcr(tcrPassphrase);
    const amount = 1000;
    const trTx = await token.transfer(tcrPassphrase, toPublicKey, tcr.asset.data.tokenAsset, amount);
    t.not(trTx.id, undefined);
    t.is(trTx.outputs[0].amount, amount.toString())
    t.is(trTx.outputs[0].public_keys[0], toPublicKey)
});

test('should-fail-transfer-low-balance', async t => {
    const tcrPassphrase = bdb.createNewPassphrase();
    const toPassphrase = bdb.createNewPassphrase();
    const toPublicKey = bdb.getKeypairFromPassphrase(toPassphrase).publicKey;
    const tcr = await helper.initTcr(tcrPassphrase);
    const amount = 21000001; //more than the default total supply of tokens
    try{
        await token.transfer(tcrPassphrase, 
            toPublicKey, tcr.asset.data.tokenAsset, amount);
    }
    catch(err){
        t.is(err.message, 'Transfer failed. Not enough token balance!');
    }
});

test('should-get-config', async t => {
    const tcrPassphrase = bdb.createNewPassphrase();
    const tcr = await helper.initTcr(tcrPassphrase);
    const configTx = await config.get(tcr.id);
    t.deepEqual(configTx.type, 'TcrConfig', 'Config get failed');
});