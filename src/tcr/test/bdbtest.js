import test from 'ava';
import * as bdb from '../shared/bdb';

test('should-create-asset', async t => {
    const user1 = bdb.createNewPassphrase();
    const tx = await bdb.createNewAsset(user1, { 'name': 'test' }, null);
    console.log(JSON.stringify(tx));
    t.is(tx.asset.data.name, 'test', tx.asset.data.name);
});