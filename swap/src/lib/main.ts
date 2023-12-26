import tsWallet from './tsWallet';
import metaWallet from './metaWallet';

export default function wallet(props) {
  const { type } = props;
  if (type === 1) {
    //ts wallet 网页钱包
    return tsWallet;
  }

  if (type === 4) {
    return metaWallet;
  }
}
