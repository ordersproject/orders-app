import Layout from '../layout/main/stake';
import _ from 'i18n';
import List from './list';
import Detail from './detail';

function Vote() {
  return (
    <>
      <Layout
        appTitle="vote"
        needVote={true}
        btns={[{ txt: 'vote', key: 0 }]}
        leftContent={<List />}
        rightContent={() => <Detail />}
      ></Layout>
    </>
  );
}

export default Vote;
