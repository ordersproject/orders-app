import {
  useAddressStore,
  useDummiesStore,
  useBtcJsStore,
  DummyUtxo,
  useNetworkStore,
} from '@/store'
import { getUtxos2 } from '@/queries'
import { calculatePsbtFee, getTxHex } from '@/lib/helpers'
import { DUMMY_UTXO_VALUE, EXTREME_FEEB, MIN_FEEB } from '@/lib/constants'
import { ElMessage } from 'element-plus'
const utils = {
  checkAndSelectDummies: async ({
    checkOnly = false,
    addressParam = null,
    collectMode = false,
  }) => {
    const address = addressParam || useAddressStore().get!
    const dummiesStore = useDummiesStore()
    const btcjsStore = useBtcJsStore()
    const networkStore = useNetworkStore()
    if (!address) return
    const candidates = await getUtxos2(address).then((utxos) => {
      console.log({ utxos })
      // only take two dummy utxos
      return utxos
        .filter((utxo) => utxo.satoshis === DUMMY_UTXO_VALUE)
        .slice(0, 2)
    })
    if (candidates.length === 2) {
      const dummyUtxos: DummyUtxo[] = []

      // set dummy utxos
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i]
        // if the second candidate has the same txId as the first one, then use the same txHex instead of fetching again.
        if (i === 1 && candidate.txId === candidates[0].txId) {
          dummyUtxos.push({
            ...candidate,
            txHex: dummyUtxos[0].txHex,
          })
        } else {
          const txHex = await getTxHex(candidate.txId)
          const dummy = {
            ...candidate,
            txHex,
          }
          dummyUtxos.push(dummy)
        }
      }
      dummiesStore.set(dummyUtxos)

      return dummyUtxos
    } else {
      if (checkOnly) return []

      const paymentUtxo = await getUtxos2(address).then((utxos) => {
        // only take two dummy utxos
        return utxos
          .filter((utxo) => utxo.satoshis >= DUMMY_UTXO_VALUE * 2 + 1000)
          .reduce((prev, curr) => {
            // pick the one with the most satoshis
            return prev.satoshis > curr.satoshis ? prev : curr
          }, utxos[0])
      })

      if (!paymentUtxo) {
        return ElMessage.error(
          `Insufficient account balance, unable to initiate subsequent transactions`
        )
      }

      const btcjs = btcjsStore.get!
      const paymentHex = await getTxHex(paymentUtxo.txId)
      // get scriptPk
      const paymentTx = btcjs.Transaction.fromHex(paymentHex)
      const paymentOutput = paymentTx.outs[paymentUtxo.outputIndex]
      const paymentScriptPk = paymentOutput.script

      const dummiesPsbt = new btcjs.Psbt({
        network: btcjs.networks[networkStore.btcNetwork],
      })
      dummiesPsbt.addInput({
        hash: paymentUtxo.txId,
        index: paymentUtxo.outputIndex,
        witnessUtxo: {
          script: paymentScriptPk,
          value: paymentUtxo.satoshis,
        },
      })

      dummiesPsbt.addOutput({ address: address, value: DUMMY_UTXO_VALUE })
      dummiesPsbt.addOutput({ address: address, value: DUMMY_UTXO_VALUE })

      const feeb = networkStore.network === 'testnet' ? EXTREME_FEEB : MIN_FEEB
      const fee = calculatePsbtFee(feeb, dummiesPsbt)

      const changeValue = paymentUtxo.satoshis - DUMMY_UTXO_VALUE * 2 - fee

      dummiesPsbt.addOutput({ address: address, value: changeValue })
      if (collectMode) {
        return {
          psbt: dummiesPsbt,
        }
      }

      // push
      const signed = await window.unisat.signPsbt(dummiesPsbt.toHex())
      const pushedTxid = await window.unisat.pushPsbt(signed)

      // extract txHex
      const signedToPsbt = btcjs.Psbt.fromHex(signed, {
        network: btcjs.networks[networkStore.btcNetwork],
      })
      const txHex = signedToPsbt.extractTransaction().toHex()
      const dummies: DummyUtxo[] = [
        {
          txId: pushedTxid,
          satoshis: DUMMY_UTXO_VALUE,
          outputIndex: 0,
          addressType: 2,
          txHex,
        },
        {
          txId: pushedTxid,
          satoshis: DUMMY_UTXO_VALUE,
          outputIndex: 1,
          addressType: 2,
          txHex,
        },
      ]
      dummiesStore.set(dummies)
    }
  },
}

export default utils
