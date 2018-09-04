import * as bootstrap from '../lib/bootstrap';

require('dotenv').config();

export async function initTcr(passphrase) {
    const namespace = "testtcr";
    const tokenSymbol = "TST";
    const config = {
        minDeposit: 100,
        minDepositVote: 10,
        applyStageLen: 0.000115741, // 10 seconds - for testing
        commitStageLen: 0.000115741,
    };
    return await bootstrap.init(passphrase, namespace, tokenSymbol, config);
}