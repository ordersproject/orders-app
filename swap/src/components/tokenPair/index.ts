import TokenIcon from '../tokenicon';
import styles from './index.less';

export default function TokenIcons(props) {
  const { symbol1, genesisID1, symbol2, genesisID2, size, style } = props;
  return (
    <div className={styles.icons} style={style}>
      <TokenIcon
        name={symbol1}
        genesisID={genesisID1 || 'mvc'}
        size={size}
        style={{ zIndex: 1 }}
      />
      <TokenIcon
        name={symbol2}
        genesisID={genesisID2 || 'mvc'}
        size={size}
        style={{ size, marginLeft: `-${size / 3}px` }}
      />
    </div>
  );
}
