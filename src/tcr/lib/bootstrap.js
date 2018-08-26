import * as bdb from '../bdb/bdb';

// creates two BigchainDB assets representing the TCR and its token
// the asset id goes into the configuration of the client dApp
export async function init(namespace, tokenSymbol) {
    const passphrase = bdb.createNewPassphrase()
    const tokenAsset = {
        namespace: namespace.toString(),
        symbol: tokenSymbol.toString().toUpperCase()
    }
    const metadata = {
        timestamp: new Date()
    }

    const tokenTx = await bdb.createToken(passphrase, tokenAsset, metadata)

    const tcrAsset = {
        namespace: namespace.toString(),
        tokenAsset: tokenTx.id
    }

    const tcrTx = await bdb.createNewAsset(passphrase, tcrAsset, metadata)
    return { passphrase, tcrTx }
}