import { useAddressStore } from '@/store'
import { calculateFee } from './build-helpers'

export async function debugBidLimit({
  exchange,
  paymentInput,
}: {
  exchange: any
  paymentInput: any
}) {
  const address = useAddressStore().get!
  let totalInput = 0
  exchange.addInput(paymentInput)
  totalInput += 546

  const feeb = 10
  const fee = calculateFee(
    feeb,
    exchange.txInputs.length + 1,
    exchange.txOutputs.length // already taken care of the exchange output bytes calculation
  )

  totalInput += paymentInput.witnessUtxo.value

  const totalOutput = exchange.txOutputs.reduce(
    (partialSum: number, a: any) => partialSum + a.value,
    0
  )

  const changeValue = totalInput - totalOutput - fee
  exchange.addOutput({
    address,
    value: changeValue,
  })

  const signed = await window.unisat.signPsbt(exchange.toHex())
  // const pushedTxid = await window.unisat.pushPsbt(signed)
  console.log({ signed })
  const pushed = await window.unisat.pushPsbt(signed)
  console.log({ pushed })
}
