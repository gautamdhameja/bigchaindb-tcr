import test from 'ava';
import * as bdb from '../shared/bdb';
import * as bootstrap from '../lib/bootstrap';
import * as token from '../lib/token';
import * as curation from '../lib/curation';
import * as constants from '../shared/constants'

require('dotenv').config();

async function initTcr(passphrase) {
    const namespace = "testtcr";
    const tokenSymbol = "TST";
    return await bootstrap.init(passphrase, namespace, tokenSymbol);
}

test('should-curate', async t => {
    // init a new TCR
    const passphrase = bdb.createNewPassphrase();
    const tcr = await initTcr(passphrase);
    t.is(tcr.asset.data.namespace, "testtcr");

    // set env variables for new TCR
    process.env.TCR_PUBLIC_KEY = bdb.getKeypairFromPassphrase(passphrase).publicKey;
    process.env.TCR_ASSET_ID = tcr.id;
    process.env.TOKEN_ASSET_ID = tcr.asset.data.tokenAsset;

    // transfer some tokens to new user
    const passphrase1 = bdb.createNewPassphrase();
    const passphrase2 = bdb.createNewPassphrase();
    const toPublicKey1 = bdb.getKeypairFromPassphrase(passphrase1).publicKey;
    const toPublicKey2 = bdb.getKeypairFromPassphrase(passphrase2).publicKey;
    const amount = 100000;

    const trTx1 = await token.transfer(passphrase, toPublicKey1, tcr.asset.data.tokenAsset, amount);
    const trTx2 = await token.transfer(passphrase, toPublicKey2, tcr.asset.data.tokenAsset, amount);
    t.not(trTx1.id, undefined);
    t.is(trTx1.outputs[0].amount, amount.toString());
    t.is(trTx1.outputs[0].public_keys[0], toPublicKey1);
    t.not(trTx2.id, undefined);
    t.is(trTx2.outputs[0].amount, amount.toString());
    t.is(trTx2.outputs[0].public_keys[0], toPublicKey2);

    // test proposal
    const proposal = await curation.propose(passphrase1, { name: "testProposal" }, 100);
    t.is(proposal.asset.data.type, constants.assetTypes.proposal, "Proposal not created");

    // test challenge
    const challenge = await curation.challenge(passphrase2, proposal.id, 1000);
    t.is(challenge.asset.data.type, constants.assetTypes.challenge, "Challenge not created");

    // test vote
    const vote = await curation.vote(passphrase1, proposal.id, 1, 10);
    t.is(vote.asset.data.type, constants.assetTypes.vote, "Vote not created");

    // duplicate challenge should fail
    try {
        await curation.challenge(passphrase2, proposal.id, 1000);
    } catch (err) {
        t.is(err.message, "This proposal is already challenged.", "Challenge duplication check failed.");
    }

    // bad vote value should fail
    try {
        await curation.vote(passphrase1, proposal.id, 5, 10);
    } catch (err) {
        t.is(err.message, "Vote can either be 0 or 1.", "Vote value check failed.");
    }
});