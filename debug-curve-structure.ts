import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

async function debugCurve() {
  const curveId = '0xf79cb75957032816d202237d1dfe7e540742d5affff5f525aa68f624f1f0ec33';
  
  const curve = await client.getObject({
    id: curveId,
    options: { showContent: true },
  });

  console.log('\n=== FULL OBJECT ===');
  console.log(JSON.stringify(curve, null, 2));
  
  if (curve.data?.content?.dataType === 'moveObject') {
    const fields = curve.data.content.fields as any;
    
    console.log('\n=== sui_reserve FIELD ===');
    console.log('Type:', typeof fields.sui_reserve);
    console.log('Value:', fields.sui_reserve);
    console.log('JSON:', JSON.stringify(fields.sui_reserve, null, 2));
    
    console.log('\n=== OTHER RELEVANT FIELDS ===');
    console.log('graduated:', fields.graduated);
    console.log('lp_seeded:', fields.lp_seeded);
    console.log('reward_paid:', fields.reward_paid);
    console.log('token_supply:', fields.token_supply);
  }
}

debugCurve().catch(console.error);
