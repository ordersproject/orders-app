import { connect } from 'umi';
import styles from './token.less';
import CustomIcon from 'components/icon';

function Token(props) {
  const { iconList, symbol } = props;
  // console.log(props);

  if (!iconList || !iconList[symbol]) return null;
  const { type, url } = iconList[symbol];

  if (type) {
    return (
      <div className={styles.icon}>
        <CustomIcon type={type} />
      </div>
    );
  }

  if (url) {
    return <img src={url} className={styles.icon} />;
  }
  return null;
}

const mapStateToProps = ({ pair }) => {
  return {
    ...pair,
  };
};

export default connect(mapStateToProps)(Token);
