import * as driver from 'bigchaindb-driver'
import env from '../env'

const API_PATH = env.bdb.apiPath
const conn = new driver.Connection(API_PATH)

async function createNewAsset(keypair, asset, metadata) {
    let condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, true)
    let output = driver.Transaction.makeOutput(condition)
    output.public_keys = [keypair.publicKey]

    const transaction = driver.Transaction.makeCreateTransaction(
        asset,
        metadata,
        [output],
        keypair.publicKey
    )

    const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey)
    return await conn.postTransactionCommit(txSigned)
}

async function transferAsset(tx, keypair, toPublicKey, metadata, amount = 0) {
    let condition = driver.Transaction.makeEd25519Condition(toPublicKey)
    let output = driver.Transaction.makeOutput(condition)
    output.public_keys = [toPublicKey]

    const txTransfer = driver.Transaction.makeTransferTransaction(
        tx,
        metadata,
        [output],
        amount
    )

    const txSigned = driver.Transaction.signTransaction(txTransfer, keypair.privateKey)
    return await conn.postTransactionCommit(txSigned)
}

export { createNewAsset, transferAsset }