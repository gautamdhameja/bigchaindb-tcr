import * as bdb from '../bdb/bdb'

// transfers an specified amount of tokens to a public key
export async function transfer(passphrase, toPublicKey, tokenId, amount) {
    const keypair = bdb.getKeypairFromPassphrase(passphrase)
    const balances = []
    const outputs = []
    let cummulativeAmount = 0
    let sufficientFunds = false

    const trAmount = parseInt(amount)
    const unspents = await bdb.getOutputs(keypair.publicKey, false)

    if (unspents && unspents.length > 0) {
        for (const unspent of unspents) {
            const tx = await bdb.getTransaction(unspent.transaction_id)
            let assetId
            if (tx.operation === 'CREATE') {
                assetId = tx.id
            }

            if (tx.operation === 'TRANSFER') {
                assetId = tx.asset.id
            }

            if (assetId === tokenId) {
                const txAmount = parseInt(tx.outputs[unspent.output_index].amount)
                cummulativeAmount += txAmount

                balances.push({
                    tx: tx,
                    output_index: unspent.output_index
                })
            }

            if (cummulativeAmount >= trAmount) {
                sufficientFunds = true
                break;
            }
        }

        if (!sufficientFunds) {
            throw new Error('Transfer failed. Not enough token balance!')
        }

        outputs.push({
            publicKey: toPublicKey,
            amount: trAmount
        })

        if (cummulativeAmount - trAmount > 0) {
            outputs.push({
                publicKey: keypair.publicKey,
                amount: cummulativeAmount - trAmount
            })
        }

        const metadata = {
            date: new Date(),
            timestamp: Date.now()
        }

        return await bdb.transferMultipleAssets(balances, keypair, outputs, metadata)
    }

    throw new Error('Token transfer failed.')
}