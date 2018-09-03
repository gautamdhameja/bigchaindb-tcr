import * as bdb from '../shared/bdb';
import * as constants from '../shared/constants'
import * as curation from './curation'
import * as token from './token'
import * as config from './config'

// finalizes a proposal based on time and voting results
// only the TCR owner can call this
export async function completeProposal(passphrase, proposalId) {
    //step 1: verify user
    const user = bdb.getKeypairFromPassphrase(passphrase)
    const tcr = await bdb.getTransaction(process.env.TCR_ASSET_ID)
    // check if user is tcr owner
    if (tcr && tcr.inputs[0].owners_before[0] === user.publicKey) {
        const proposalTx = await bdb.getTransaction(proposalId)
        if (proposalTx && proposalTx.asset.data.type === constants.assetTypes.proposal) {
            // finalize proposal based on challenge
            const challenge = await curation.getChallengeForProposal(proposalId)
            if (!challenge) {
                return await completeProposalWithoutChallenge(passphrase, proposalTx)
            } else {
                return await completeProposalWithChallenge(passphrase, proposalTx, challenge)
            }
        }
    } else {
        throw new Error("Access Denied.")
    }
}

// finalizes a proposal if there is no challenge and apply stage length has reached
async function completeProposalWithoutChallenge(passphrase, proposalTx) {
    const configValues = await config.get(process.env.TCR_ASSET_ID)
    const deadline = proposalTx.asset.data.timestamp +
        1000 * 60 * 60 * 24 * configValues.applyStageLen
    if (Date.now() >= deadline) {
        const completionAsset = {
            type: constants.assetTypes.completion,
            proposal: proposalTx.id,
            lockedStake: proposalTx.asset.data.stakeAmount,
            tcr: process.env.TCR_ASSET_ID,
            timestamp: Date.now()
        }

        const metadata = {
            date: new Date()
        }

        return await bdb.createNewAsset(passphrase, completionAsset, metadata)
    } else {
        throw new Error("Cannot complete as applyStageLen is not reached.")
    }
}

// finalizes a proposal if there is a challenge and commit stage length has reached
async function completeProposalWithChallenge(passphrase, proposalTx, challenge) {
    const configValues = await config.get(process.env.TCR_ASSET_ID)
    const deadline = proposalTx.asset.data.timestamp +
        1000 * 60 * 60 * 24 * configValues.commitStageLen
    if (Date.now() >= deadline) {
        if (await doStakeDistribution(passphrase, proposalTx, challenge)) {
            const completionAsset = {
                type: constants.assetTypes.completion,
                proposal: proposalTx.id,
                challenge: challenge.id,
                lockedStake: proposalTx.asset.data.stakeAmount,
                tcr: process.env.TCR_ASSET_ID,
                timestamp: Date.now()
            }

            const metadata = {
                date: new Date()
            }

            return await bdb.createNewAsset(passphrase, completionAsset, metadata)
        } else {
            return "Proposal completed with rejection."
        }
    } else {
        throw new Error("Cannot complete as applyStageLen is not reached.")
    }
}

// does the stake distribution after commit stage length
async function doStakeDistribution(passphrase, proposal, challenge) {
    let challengeStake = challenge.data.stakeAmount
    let proposalStake = proposal.asset.data.stakeAmount
    let forVoteStake = 0
    let againstVoteStake = 0
    let forVoteOutputs = []
    let againstVoteOutputs = []

    // get votes
    const votes = await getVotesForProposal(proposal.id)
    if (votes.length > 0) {
        for (const vote of votes) {
            const output = {
                publicKey: vote.data.createdBy,
                votingStake: vote.data.stakeAmount
            }

            // against votes
            if (vote.data.voteValue === 0) {
                againstVoteStake += vote.data.stakeAmount
                challengeStake += vote.data.stakeAmount
                againstVoteOutputs.push(output)
            }

            // for votes
            if (vote.data.voteValue === 1) {
                forVoteStake += vote.data.stakeAmount
                proposalStake += vote.data.stakeAmount
                forVoteOutputs.push(output)
            }
        }
    }

    // finalize proposal
    if (proposalStake >= challengeStake) {
        // proposal accepted
        for (let e of forVoteOutputs) {
            const winAmount = Math.floor((challengeStake / forVoteStake) * e.votingStake) + e.votingStake
            await token.transfer(passphrase, e.publicKey, process.env.TOKEN_ASSET_ID, winAmount)
        }
        return true
    } else {
        // proposal rejected
        for (let e of againstVoteOutputs) {
            const winAmount = Math.floor((proposalStake / againstVoteStake) * e.votingStake) + e.votingStake
            // give the challenge amount back to the challenger
            if (e.publicKey === challenge.data.createdBy) {
                winAmount += challenge.data.stakeAmount
            }
            await token.transfer(passphrase, e.publicKey, process.env.TOKEN_ASSET_ID, winAmount)
        }

        return false
    }
}

// gets votes for a proposal
async function getVotesForProposal(proposalId) {
    const allVotes = []
    const votes = await bdb.searchAssets(constants.assetTypes.vote)
    if (votes && votes.length > 0) {
        for (const vote of votes) {
            if (vote.data.proposal === proposalId) {
                allVotes.push(vote)
            }
        }
    }

    return allVotes
}