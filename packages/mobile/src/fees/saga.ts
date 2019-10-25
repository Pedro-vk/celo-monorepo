import { getStableTokenContract } from '@celo/walletkit'
import BigNumber from 'bignumber.js'
import { call, CallEffect, put, takeLatest } from 'redux-saga/effects'
import { showError } from 'src/alert/actions'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { getReclaimEscrowGas } from 'src/escrow/saga'
import { Actions, EstimateFeeAction, feeEstimated, FeeType } from 'src/fees/actions'
import { getInvitationVerificationFeeInWei, getInviteTxGas } from 'src/invite/saga'
import { getSendTxGas } from 'src/send/saga'
import { CeloDefaultRecipient } from 'src/send/Send'
import { BasicTokenTransfer } from 'src/tokens/saga'
import Logger from 'src/utils/Logger'
import { web3 } from 'src/web3/contracts'
import { getGasPrice } from 'src/web3/gas'
import { getConnectedAccount } from 'src/web3/saga'

const TAG = 'fees/saga'
// Cache of the gas estimates for common tx types
// Prevents us from having to recreate txs and estimate their gas each time
const feeGasCache = new Map<FeeType, BigNumber>()
// Just use default values here since it doesn't matter for fee estimation
const placeholderSendTx: BasicTokenTransfer = {
  recipientAddress: CeloDefaultRecipient.address,
  amount: web3.utils.fromWei('1'),
  comment: 'Coffee or Tea?',
}

export function* estimateFeeSaga({ feeType }: EstimateFeeAction) {
  Logger.debug(`${TAG}/estimateFeeSaga`, `updating for ${feeType}`)
  try {
    const account = yield call(getConnectedAccount)

    let feeInWei: BigNumber | null = null

    switch (feeType) {
      case FeeType.INVITE:
        feeInWei = yield call(
          getOrSetFee,
          FeeType.INVITE,
          call(
            getInviteTxGas,
            account,
            getStableTokenContract,
            placeholderSendTx.amount,
            placeholderSendTx.comment
          )
        )
        feeInWei = feeInWei!.plus(getInvitationVerificationFeeInWei())
        break
      case FeeType.SEND:
        console.log(111, 3)
        console.log(111, [getSendTxGas, account, getStableTokenContract, placeholderSendTx])
        console.log(111, 3)
        feeInWei = yield call(
          getOrSetFee,
          FeeType.SEND,
          call(getSendTxGas, account, getStableTokenContract, placeholderSendTx)
        )
        console.log(111, 4, feeInWei)
        break
      case FeeType.EXCHANGE:
        // TODO
        break
      case FeeType.RECLAIM_ESCROW:
        feeInWei = yield call(
          getOrSetFee,
          FeeType.RECLAIM_ESCROW,
          call(getReclaimEscrowGas, account, CeloDefaultRecipient.address)
        )
        break
    }

    if (feeInWei) {
      Logger.debug(`${TAG}/estimateFeeSaga`, `New fee is: ${feeInWei}`)
      yield put(feeEstimated(feeType, feeInWei.toString()))
    }
  } catch (error) {
    console.log(error)
    Logger.error(`${TAG}/estimateFeeSaga`, 'Error estimating fee', error)
    yield put(showError(ErrorMessages.CALCULATE_FEE_FAILED))
  }
}

function* getOrSetFee(feeType: FeeType, gasGetter: CallEffect) {
  console.log(111111, 0, 0, '-----------------')
  console.log(feeGasCache.get(feeType))
  console.log(111111, 0, 1, '-----------------')
  if (!feeGasCache.get(feeType)) {
    const gas: BigNumber = yield gasGetter
    feeGasCache.set(feeType, gas)
  }
  console.log(111111, 1, '-----------------')
  console.log(calculateFee)
  console.log(feeGasCache.get(feeType))
  console.log(111111, 2, '-----------------')
  const feeInWei: BigNumber = yield call(calculateFee, feeGasCache.get(feeType)!)
  return feeInWei
}

export async function calculateFee(gas: BigNumber) {
  const gasPrice = await getGasPrice()
  if (!gasPrice) {
    throw new Error('Invalid gas price')
  }

  const feeInWei = gas.multipliedBy(gasPrice)
  Logger.debug(`${TAG}/calculateFee`, `Calculated fee is: ${feeInWei.toString()}`)
  return feeInWei
}

export function* feesSaga() {
  yield takeLatest(Actions.ESTIMATE_FEE, estimateFeeSaga)
}
