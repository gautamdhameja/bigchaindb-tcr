import * as bdb from '../shared/bdb';
import * as constants from '../shared/constants'

// const config = {
//     minDeposit: 100,
//     minDepositVote: 10,
//     applyStageLen: 5,
//     commitStageLen: 5
// }

// creates three BigchainDB assets representing the TCR, its token and config
export async function init(passphrase, namespace, tokenSymbol, config) {
    const timestamp = Date.now()

    const tokenAsset = {
        namespace: namespace.toString(),
        symbol: tokenSymbol.toString().toUpperCase(),
        type: constants.assetTypes.token,
        timestamp
    }

    const metadata = {
        date: new Date()
    }

    const tokenTx = await bdb.createToken(passphrase, tokenAsset, metadata)

    const configAsset = {
        ...config,
        type: constants.assetTypes.config,
        timestamp
    }

    const configTx = await bdb.createNewAsset(passphrase, configAsset, metadata)

    const tcrAsset = {
        namespace: namespace.toString(),
        tokenAsset: tokenTx.id,
        configAsset: configTx.id,
        type: constants.assetTypes.tcr,
        timestamp
    }

    return await bdb.createNewAsset(passphrase, tcrAsset, metadata)
}