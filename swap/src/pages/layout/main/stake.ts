import Layout from './index';
import StakeData from './stakeData';

function StakeLayout(props) {
  return (
    <Layout {...props}>
      <StakeData needVote={props.needVote} />
    </Layout>
  );
}

export default StakeLayout;
