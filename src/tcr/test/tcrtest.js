import test from 'ava';
import * as bootstrap from '../lib/bootstrap';

test('should-init', async t => {
    const namespace = "testtcr";
    const tcr = await bootstrap.init(namespace);
    console.log(tcr);
    t.is(tcr.tcrTx.asset.data.namespace, namespace);
});