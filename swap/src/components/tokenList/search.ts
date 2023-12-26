import { Input } from 'antd';
import styles from './index.less';
import _ from 'i18n';

const { Search } = Input;

const escapeRegExpWildcards = (searchStr) => {
  const regExp = /([\(\[\{\\\^\$\}\]\)\?\*\+\.])/gim;
  if (searchStr && regExp.test(searchStr)) {
    return searchStr.replace(regExp, '\\$1');
  }
  return searchStr;
};

const searchByKeywords = (keywords, searchArr, type) => {
  const keywordsExp = new RegExp(
    '.*?' + escapeRegExpWildcards(keywords) + '.*?',
    'img',
  );

  return searchArr.filter((v) => {
    if (type === 'pair') {
      return (
        keywordsExp.test(v.token1.symbol) ||
        keywordsExp.test(v.token2.symbol) ||
        keywords == v.token1.tokenID ||
        keywords == v.token2.tokenID
      );
    }
    return keywordsExp.test(v.symbol) || keywords == v.tokenID;
  });
};

const handleChange = (e, props) => {
  const { value } = e.target;
  const { allPairs, changeShowList, type } = props;

  if (!value) {
    return changeShowList(allPairs);
  }
  const searchResultList = searchByKeywords(value, allPairs, type);
  changeShowList(searchResultList);
};

export default function SearchTokenPair(props) {
  return (
    <div className={styles.search}>
      <Search
        size="large"
        className={styles.search_input}
        placeholder={_('search_token_holder')}
        onChange={(e) => handleChange(e, props)}
      />
    </div>
  );
}
