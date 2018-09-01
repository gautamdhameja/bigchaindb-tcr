import * as bdb from '../shared/bdb';
import * as constants from '../shared/constants'

// creates three BigchainDB assets representing the TCR, its token and config
export async function init(passphrase, namespace, tokenSymbol) {
    const tokenAsset = {
        namespace: namespace.toString(),
        symbol: tokenSymbol.toString().toUpperCase(),
        type: constants.assetTypes.token
    }
    const metadata = {
        timestamp: new Date()
    }

    const tokenTx = await bdb.createToken(passphrase, tokenAsset, metadata)

    const configAsset = {
        minDeposit: 100,
        minDepositVote: 10,
        applyStageLen: 5,
        commitStageLen: 5,
        type: constants.assetTypes.config
    }

    const configTx = await bdb.createNewAsset(passphrase, configAsset, metadata)

    const tcrAsset = {
        namespace: namespace.toString(),
        tokenAsset: tokenTx.id,
        configAsset: configTx.id,
        type: constants.assetTypes.tcr
    }

    return await bdb.createNewAsset(passphrase, tcrAsset, metadata)
}