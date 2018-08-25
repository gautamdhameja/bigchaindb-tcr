import * as bdb from '../bdb/bdb';

// creates a BigchainDB asset representing the TCR
// the asset id goes into the configuration of the client dApp
export async function init(namespace) {
    const passphrase = bdb.createNewPassphrase()
    const tcrAsset = {
        namespace: namespace.toString(),
    }
    const metadata = {
        timestamp: new Date()
    }
    const tcrTx = await bdb.createNewAsset(passphrase, tcrAsset, metadata)
    return {
        passphrase,
        tcrTx
    }
}