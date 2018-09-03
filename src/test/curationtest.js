import test from 'ava';
import * as bdb from '../shared/bdb';
import * as bootstrap from '../lib/bootstrap';
import * as token from '../lib/token';
import * as curation from '../lib/curation';
import * as constants from '../shared/constants'
import * as finalizer from '../lib/finalizer'

require('dotenv').config();

async function initTcr(passphrase) {
    const namespace = "testtcr";
    const tokenSymbol = "TST";
    return await bootstrap.init(passphrase, namespace, tokenSymbol);
}

async function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

test.serial('should-curate', async t => {
    // init a new TCR
    const passphrase = bdb.createNewPassphrase();
    const tcr = await initTcr(passphrase);
    t.is(tcr.asset.data.namespace, "testtcr");

    // set env variables for new TCR
    process.env.TCR_PUBLIC_KEY = bdb.getKeypairFromPassphrase(passphrase).publicKey;
    process.env.TCR_ASSET_ID = tcr.id;
    process.env.TOKEN_ASSET_ID = tcr.asset.data.tokenAsset;

    // transfer some tokens to a couple of new users
    const passphrase1 = bdb.createNewPassphrase();
    const passphrase2 = bdb.createNewPassphrase();
    const toPublicKey1 = bdb.getKeypairFromPassphrase(passphrase1).publicKey;
    const toPublicKey2 = bdb.getKeypairFromPassphrase(passphrase2).publicKey;
    const amount = 10000;

    const trTx1 = await token.transfer(passphrase, toPublicKey1, tcr.asset.data.tokenAsset, amount);
    const trTx2 = await token.transfer(passphrase, toPublicKey2, tcr.asset.data.tokenAsset, amount);
    t.not(trTx1.id, undefined);
    t.is(trTx1.outputs[0].amount, amount.toString());
    t.is(trTx1.outputs[0].public_keys[0], toPublicKey1);
    t.not(trTx2.id, undefined);
    t.is(trTx2.outputs[0].amount, amount.toString());
    t.is(trTx2.outputs[0].public_keys[0], toPublicKey2);

    // bad proposal stake should fail, less than 100 - user 1
    try {
        await curation.propose(passphrase1, { name: "testProposal" }, 50);
    } catch (err) {
        t.is(err.message, "Proposal stake is less than TCR minimum deposit.", "Challenge stake check failed.");
    }

    // test proposal - user 1
    const proposal = await curation.propose(passphrase1, { name: "testProposal" }, 1000);
    t.is(proposal.asset.data.type, constants.assetTypes.proposal, "Proposal not created");

    // bad challenge stake should fail, less than 1000 - user 2
    try {
        await curation.challenge(passphrase2, proposal.id, 999);
    } catch (err) {
        t.is(err.message, "Challenge stake is less than proposal stake.", "Challenge stake check failed.");
    }

    // test challenge - user 2
    const challenge = await curation.challenge(passphrase2, proposal.id, 1000);
    t.is(challenge.asset.data.type, constants.assetTypes.challenge, "Challenge not created");

    // test vote - user 1
    const vote = await curation.vote(passphrase1, proposal.id, 1, 10);
    t.is(vote.asset.data.type, constants.assetTypes.vote, "Vote not created");

    // duplicate challenge should fail - user 2
    try {
        await curation.challenge(passphrase2, proposal.id, 1000);
    } catch (err) {
        t.is(err.message, "This proposal is already challenged.", "Challenge duplication check failed.");
    }

    // bad vote value should fail, other than 0 or 1 - user 1
    try {
        await curation.vote(passphrase1, proposal.id, 5, 10);
    } catch (err) {
        t.is(err.message, "Vote can either be 0 or 1.", "Vote value check failed.");
    }

    // bad vote stake should fail, less than 10 - user 2
    try {
        await curation.vote(passphrase2, proposal.id, 0, 1);
    } catch (err) {
        t.is(err.message, "Vote stake is less than TCR minimum vote deposit.", "Vote stake check failed.");
    }
});

test.serial('should-finalize-with-challenge-accept', async t => {
    // init a new TCR
    const passphrase = bdb.createNewPassphrase();
    const tcr = await initTcr(passphrase);
    t.is(tcr.asset.data.namespace, "testtcr");

    // set env variables for new TCR
    process.env.TCR_PUBLIC_KEY = bdb.getKeypairFromPassphrase(passphrase).publicKey;
    process.env.TCR_ASSET_ID = tcr.id;
    process.env.TOKEN_ASSET_ID = tcr.asset.data.tokenAsset;

    // transfer some tokens to a couple of new users
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

    // test proposal - user 1
    const proposal = await curation.propose(passphrase1, { name: "testProposal" }, 100);
    t.is(proposal.asset.data.type, constants.assetTypes.proposal, "Proposal not created");

    // test challenge - user 2
    const challenge = await curation.challenge(passphrase2, proposal.id, 100);
    t.is(challenge.asset.data.type, constants.assetTypes.challenge, "Challenge not created");

    // test vote - user 1
    const vote = await curation.vote(passphrase1, proposal.id, 1, 20);
    t.is(vote.asset.data.type, constants.assetTypes.vote, "Vote not created");

    // test vote - user 2
    const vote1 = await curation.vote(passphrase2, proposal.id, 0, 10);
    t.is(vote1.asset.data.type, constants.assetTypes.vote, "Vote not created");

    // sleep
    await sleep(20000);

    // finalize
    const finalize = await finalizer.completeProposal(passphrase, proposal.id);
    t.is(finalize.asset.data.type, constants.assetTypes.completion, "Completion not successful.");
});

test.serial('should-finalize-with-challenge-reject', async t => {
    // init a new TCR
    const passphrase = bdb.createNewPassphrase();
    const tcr = await initTcr(passphrase);
    t.is(tcr.asset.data.namespace, "testtcr");

    // set env variables for new TCR
    process.env.TCR_PUBLIC_KEY = bdb.getKeypairFromPassphrase(passphrase).publicKey;
    process.env.TCR_ASSET_ID = tcr.id;
    process.env.TOKEN_ASSET_ID = tcr.asset.data.tokenAsset;

    // transfer some tokens to a couple of new users
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

    // test proposal - user 1
    const proposal = await curation.propose(passphrase1, { name: "testProposal" }, 100);
    t.is(proposal.asset.data.type, constants.assetTypes.proposal, "Proposal not created");

    // test challenge - user 2
    const challenge = await curation.challenge(passphrase2, proposal.id, 1000);
    t.is(challenge.asset.data.type, constants.assetTypes.challenge, "Challenge not created");

    // test vote - user 1
    const vote = await curation.vote(passphrase1, proposal.id, 1, 20);
    t.is(vote.asset.data.type, constants.assetTypes.vote, "Vote not created");

    // test vote - user 2
    const vote1 = await curation.vote(passphrase2, proposal.id, 0, 10);
    t.is(vote1.asset.data.type, constants.assetTypes.vote, "Vote not created");

    // sleep
    await sleep(20000);

    // finalize
    const finalize = await finalizer.completeProposal(passphrase, proposal.id);
    t.is(finalize, "Proposal completed with rejection.", "Completion not successful.");
});

test.serial('should-finalize-without-challenge', async t => {
    // init a new TCR
    const passphrase = bdb.createNewPassphrase();
    const tcr = await initTcr(passphrase);
    t.is(tcr.asset.data.namespace, "testtcr");

    // set env variables for new TCR
    process.env.TCR_PUBLIC_KEY = bdb.getKeypairFromPassphrase(passphrase).publicKey;
    process.env.TCR_ASSET_ID = tcr.id;
    process.env.TOKEN_ASSET_ID = tcr.asset.data.tokenAsset;

    // transfer some tokens to a couple of new users
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

    // test proposal - user 1
    const proposal = await curation.propose(passphrase1, { name: "testProposal" }, 100);
    t.is(proposal.asset.data.type, constants.assetTypes.proposal, "Proposal not created");

    // sleep
    await sleep(10000);

    // finalize
    const finalize = await finalizer.completeProposal(passphrase, proposal.id);
    t.is(finalize.asset.data.type, constants.assetTypes.completion, "Completion not successful.");
});