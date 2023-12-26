import Layout from '../layout/main/stake';
import _ from 'i18n';
import Stake from './stake';
import Unstake from './unstake';
import Content from './info';
import Menu from 'components/menu';

function StakePage() {
  return (
    <Layout
      appTitle="stake"
      btns={[{ txt: 'stake', key: 0 }]}
      leftContent={<Content />}
      rightContent={(index) => (
        <Menu
          menus={['stake', 'unstake']}
          contents={[<Stake />, <Unstake />]}
          currentMenuIndex={index}
        />
      )}
    ></Layout>
  );
}

export default StakePage;
