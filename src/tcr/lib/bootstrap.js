import * as bdb from '../shared/bdb';

// creates three BigchainDB assets representing the TCR, its token and config
export async function init(passphrase, namespace, tokenSymbol) {
    const tokenAsset = {
        namespace: namespace.toString(),
        symbol: tokenSymbol.toString().toUpperCase()
    }
    const metadata = {
        timestamp: new Date()
    }

    const tokenTx = await bdb.createToken(passphrase, tokenAsset, metadata)

    const configAsset = {
        minDeposit: 100,
        minDepositVote: 10,
        applyStageLen: 5,
        commitStageLen: 5
    }

    const configTx = await bdb.createNewAsset(passphrase, configAsset, metadata)

    const tcrAsset = {
        namespace: namespace.toString(),
        tokenAsset: tokenTx.id,
        configAsset: configTx.id
    }

    return await bdb.createNewAsset(passphrase, tcrAsset, metadata)
}