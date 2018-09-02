import * as bdb from '../shared/bdb';

// can be set by the owner of the TCR asset
export async function set(tcrId, values) {
    // todo
}

// gets the config asset of a tcr
export async function get(tcrId) {
    const tcr = await bdb.getTransaction(tcrId)
    if(tcr && tcr.asset.data.configAsset) {
        const config = await bdb.getTransaction(tcr.asset.data.configAsset)
        return config.asset.data
    }
}