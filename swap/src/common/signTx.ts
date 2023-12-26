import { ungzip } from 'node-gzip';
import _ from 'i18n';

export const userSignTx = async (
  apiName,
  dispatch,
  data,
  requestIndex,
  apiOtherParams = {},
) => {
  const { txHex, scriptHex, satoshis, inputIndex } = data;

  let sign_res = await dispatch({
    type: 'user/signTx',
    payload: {
      datas: {
        txHex,
        scriptHex,
        satoshis,
        inputIndex,
      },
    },
  });
  // console.log(sign_res);

  if (sign_res.msg && !sign_res.sig) {
    return {
      msg: sign_res,
    };
  }

  const { publicKey, sig } = sign_res;

  let payload = {
    requestIndex,
    pubKey: publicKey,
    sig,
  };
  if (JSON.stringify(apiOtherParams) !== '{}') {
    payload = {
      ...payload,
      ...apiOtherParams,
    };
  }

  const res = await dispatch({
    type: apiName,
    payload,
  });
  // console.log(res);
  if (res.code === 99999) {
    const raw = await ungzip(Buffer.from(res.data.other));
    const newData = JSON.parse(raw.toString());
    return userSignTx(newData, requestIndex);
  }

  if (res.code) {
    return {
      msg: res.msg,
    };
  }
  return res;
};
