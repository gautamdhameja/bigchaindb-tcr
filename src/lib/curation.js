import * as bdb from '../shared/bdb';
import * as constants from '../shared/constants'
import * as token from './token'
import * as config from './config'

// proposal = {
//     name: "name of proposal"
// }
// the reason for taking proposal as an object and not as a string is extensibility
// if a complex object is added as proposal, it would still work
// see - https://medium.com/@DimitriDeJonghe/curated-governance-with-stake-machines-8ae290a709b4

// creates a new asset of the type proposal
export async function propose(passphrase, proposal, stakeAmount) {
    const configValues = await config.get(process.env.TCR_ASSET_ID)
    if (configValues.minDeposit > stakeAmount) {
        throw new Error("Proposal stake is less than TCR minimum deposit.")
    }

    //step 1: transfer stake
    const trTx = await token.transfer(
        passphrase, process.env.TCR_PUBLIC_KEY,
        process.env.TOKEN_ASSET_ID, stakeAmount)

    // step 2: create proposal asset
    const proposalAsset = {
        createdBy: bdb.getKeypairFromPassphrase(passphrase).publicKey,
        type: constants.assetTypes.proposal,
        tcr: process.env.TCR_ASSET_ID,
        stakeTx: trTx.id,
        stakeAmount,
        proposalData: proposal,
        timestamp: Date.now()
    }

    const metadata = {
        date: new Date()
    }

    return await bdb.createNewAsset(passphrase, proposalAsset, metadata)
}

// creates a new asset of the type challenge
// challenge has not data, 
// the existence of challenge asset means the proposal has been challenged and needs voting
export async function challenge(passphrase, proposalId, stakeAmount) {
    // step 1: verify proposal
    const proposalTx = await bdb.getTransaction(proposalId)
    if (proposalTx && proposalTx.asset.data.type === constants.assetTypes.proposal) {
        if (proposalTx.asset.data.stakeAmount > stakeAmount) {
            throw new Error("Challenge stake is less than proposal stake.")
        }

        // check if challenge already exists or challenge time has passed
        if (await getChallengeForProposal(proposalId)) {
            throw new Error("This proposal is already challenged.")
        }

        const configValues = await config.get(process.env.TCR_ASSET_ID)
        const deadline = proposalTx.asset.data.timestamp +
            1000 * 60 * 60 * 24 * configValues.applyStageLen
        if (Date.now() >= deadline) {
            throw new Error("Challenge period has passed.")
        }

        //step 2: transfer stake
        const trTx = await token.transfer(
            passphrase, process.env.TCR_PUBLIC_KEY,
            process.env.TOKEN_ASSET_ID, stakeAmount)

        // step 3: create challenge asset
        const challengeAsset = {
            createdBy: bdb.getKeypairFromPassphrase(passphrase).publicKey,
            stakeTx: trTx.id,
            type: constants.assetTypes.challenge,
            proposal: proposalId,
            stakeAmount,
            timestamp: Date.now()
        }

        const metadata = {
            date: new Date()
        }

        return await bdb.createNewAsset(passphrase, challengeAsset, metadata)
    } else {
        throw new Error("Invalid proposal.")
    }
}

// create a vote asset
// vote can either be 0 or 1
// TODO: blind voting
export async function vote(passphrase, proposalId, vote, stakeAmount) {
    const configValues = await config.get(process.env.TCR_ASSET_ID)
    if (configValues.minDepositVote > stakeAmount) {
        throw new Error("Vote stake is less than TCR minimum vote deposit.")
    }

    // step 1: verify proposal and challenge
    const proposalTx = await bdb.getTransaction(proposalId)
    if (proposalTx && proposalTx.asset.data.type === constants.assetTypes.proposal) {
        // step 2: check if challenge exists
        const challenge = await getChallengeForProposal(proposalId)
        if (!challenge) {
            throw new Error("This proposal is not challenged.")
        }

        // step 3: check if deadline has passed
        const deadline = challenge.data.timestamp +
            1000 * 60 * 60 * 24 * configValues.commitStageLen
        if (Date.now() >= deadline) {
            throw new Error("Voting period has passed.")
        }

        if (vote === 1 || vote === 0) {
            //step 4: transfer stake
            const trTx = await token.transfer(
                passphrase, process.env.TCR_PUBLIC_KEY,
                process.env.TOKEN_ASSET_ID, stakeAmount)

            // step 5: create vote asset
            const voteAsset = {
                createdBy: bdb.getKeypairFromPassphrase(passphrase).publicKey,
                stakeTx: trTx.id,
                type: constants.assetTypes.vote,
                proposal: proposalId,
                stakeAmount,
                voteValue: vote,
                timestamp: Date.now()
            }

            const metadata = {
                date: new Date()
            }

            return await bdb.createNewAsset(passphrase, voteAsset, metadata)
        } else {
            throw new Error("Vote can either be 0 or 1.")
        }
    } else {
        throw new Error("Invalid proposal.")
    }
}

export async function getChallengeForProposal(proposalId) {
    const challenges = await bdb.searchAssets(constants.assetTypes.challenge)
    if (challenges && challenges.length > 0) {
        for (const challenge of challenges) {
            if (challenge.data.proposal === proposalId) {
                return challenge
            }
        }
    }

    return null
}