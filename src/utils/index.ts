import {
  useAddressStore,
  useDummiesStore,
  useBtcJsStore,
  DummyUtxo,
  useNetworkStore,
} from '@/store'
import { getUtxos2 } from '@/queries'
import { calculateFee, getTxHex, prettyAddress } from '@/lib/helpers'
import { DUMMY_UTXO_VALUE, EXTREME_FEEB, MIN_FEEB } from '@/lib/constants'
import { ElMessage } from 'element-plus'
const utils = {
  checkAndSelectDummies: async () => {
    const address = useAddressStore()
    const dummiesStore = useDummiesStore()
    const btcjsStore = useBtcJsStore()
    const networkStore = useNetworkStore()
    if (!address.get) return
    const candidates = await getUtxos2(address.get!).then((utxos) => {
      console.log({ utxos })
      // only take two dummy utxos
      return utxos
        .filter((utxo) => utxo.satoshis === DUMMY_UTXO_VALUE)
        .slice(0, 2)
    })
    if (candidates.length === 2) {
      const dummyUtxos: DummyUtxo[] = []

      // set dummy utxos
      for (const candidate of candidates) {
        const txHex = await getTxHex(candidate.txId)
        const dummy = {
          ...candidate,
          txHex,
        }
        dummyUtxos.push(dummy)
      }
      dummiesStore.set(dummyUtxos)
    } else {
      const paymentUtxo = await getUtxos2(address.get!).then((utxos) => {
        console.log({ utxos })
        // only take two dummy utxos
        return utxos.filter(
          (utxo) => utxo.satoshis >= DUMMY_UTXO_VALUE * 2 + 1000
        )[0]
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

      dummiesPsbt.addOutput({ address: address.get, value: DUMMY_UTXO_VALUE })
      dummiesPsbt.addOutput({ address: address.get, value: DUMMY_UTXO_VALUE })

      const fee = calculateFee(
        MIN_FEEB, // minimum feeb
        1,
        2 // already taken care of the exchange output bytes calculation
      )
      const changeValue = paymentUtxo.satoshis - DUMMY_UTXO_VALUE * 2 - fee

      dummiesPsbt.addOutput({ address: address.get, value: changeValue })

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
