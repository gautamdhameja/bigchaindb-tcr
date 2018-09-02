import * as bdb from '../shared/bdb';
import * as constants from '../shared/constants'
import * as token from './token'
import * as config from './config'

export async function completeProposal(passphrase, proposalId) {
    //step 1: verify user
    const user = bdb.getKeypairFromPassphrase(passphrase)
    const tcr = await bdb.getTransaction(process.env.TCR_ASSET_ID)
    if (tcr && tcr.inputs[0].owners_before[0] === user.publicKey) {
        const proposal = await bdb.getTransaction(proposalId)
    } else {
        throw new Error ("Access Denied.")
    }
}