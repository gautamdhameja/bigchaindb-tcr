import * as driver from 'bigchaindb-driver'
import bip39 from 'bip39'

require('dotenv').config();

const conn = new driver.Connection(process.env.BDB_API_PATH)

export function createNewPassphrase() {
    return bip39.generateMnemonic()
}

export function getKeypairFromPassphrase(passphrase) {
    return new driver.Ed25519Keypair(bip39.mnemonicToSeed(passphrase).slice(0, 32))
}

export async function getTransaction(assetId) {
    return await conn.getTransaction(assetId)
}

export async function getTransferTransactionsForAsset(assetId) {
    return conn.listTransactions(assetId, 'TRANSFER')
}

export async function getOutputs(publicKey, spent = false) {
    return await conn.listOutputs(publicKey, spent)
}

export async function searchAssets(text) {
    return await conn.searchAssets(text)
}

// the maxAmount is defaulted to 21M (just because Satoshi decided there will be a max of 21M BTC only)
export async function createToken(passphrase, asset, metadata, amount = 21000000) {
    const keypair = getKeypairFromPassphrase(passphrase)
    let condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, true)
    let output = driver.Transaction.makeOutput(condition, amount.toString())
    output.public_keys = [keypair.publicKey]

    const transaction = driver.Transaction.makeCreateTransaction(
        asset,
        metadata, [output],
        keypair.publicKey
    )

    const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey)
    return await conn.postTransactionCommit(txSigned)
}

export async function createNewAsset(passphrase, asset, metadata) {
    const keypair = getKeypairFromPassphrase(passphrase)
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

export async function transferMultipleAssets(unspentTxs, keypair, outputs, metadata) {
    const transferOutputs = []
    if (outputs.length > 0) {
        for (const output of outputs) {
            let condition = driver.Transaction.makeEd25519Condition(output.publicKey)
            let transferOutput
            if (output.amount > 0) {
                transferOutput = driver.Transaction.makeOutput(condition, output.amount.toString())
            } else {
                transferOutput = driver.Transaction.makeOutput(condition)
            }

            transferOutput.public_keys = [output.publicKey]
            transferOutputs.push(transferOutput)
        }
    }

    const txTransfer = driver.Transaction.makeTransferTransaction(
        unspentTxs,
        transferOutputs,
        metadata
    )

    const txSigned = driver.Transaction.signTransaction(txTransfer, keypair.privateKey)
    return await conn.postTransactionCommit(txSigned)
}

export async function transferAsset(transaction, keypair, toPublicKey, metadata) {
    const transferTxs = [{
        tx: transaction,
        output_index: 0
    }]
    const outputs = [{
        publicKey: toPublicKey,
        amount: 0
    }]

    return await transferMultipleAssets(transferTxs, keypair, outputs, metadata)
}