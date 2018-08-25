import * as driver from 'bigchaindb-driver'
import bip39 from 'bip39'
import env from '../env'

const API_PATH = env.bdb.apiPath
const conn = new driver.Connection(API_PATH)

export function createNewPassphrase() {
    return bip39.generateMnemonic()
}

function getKeypairFromPassphrase(passphrase) {
    return new driver.Ed25519Keypair(bip39.mnemonicToSeed(passphrase).slice(0, 32))
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

export async function transferAsset(tx, passphrase, toPublicKey, metadata, amount = 0) {
    const keypair = getKeypairFromPassphrase(passphrase)
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