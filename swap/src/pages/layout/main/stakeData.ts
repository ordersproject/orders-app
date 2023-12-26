import { useEffect, useState } from 'react';
import { connect, useDispatch } from 'umi';
import EventBus from 'common/eventBus';
import _ from 'i18n';

function GetData(props) {
  const dispatch = useDispatch();
  const { currentStakePair, accountInfo, needVote = false, pairData } = props;
  const [varA, setVarA] = useState(0);
  const [varB, setVarB] = useState(0);

  useEffect(() => {
    dispatch({
      type: 'stake/getAllPairs',
      payload: {},
    });
    EventBus.on('reloadPair', () => {
      dispatch({
        type: 'stake/getStakeInfo',
        payload: {},
      });
    });
  }, []);

  useEffect(() => {
    dispatch({
      type: 'stake/getStakeInfo',
      payload: {},
    });
    const timeoutA = setTimeout(async () => {
      setVarA(varA + 1);
      dispatch({
        type: 'stake/getStakeInfo',
        payload: {},
      });
    }, 30 * 1e3);

    return () => {
      clearTimeout(timeoutA);
    };
  }, [varA, currentStakePair, accountInfo.userAddress]);

  useEffect(() => {
    dispatch({
      type: 'stake/getVoteInfo',
      payload: {},
    });
    const timeoutB = setTimeout(async () => {
      setVarB(varB + 1);
      dispatch({
        type: 'stake/getVoteInfo',
        payload: {},
      });
    }, 30 * 1e3);

    return () => {
      clearTimeout(timeoutB);
    };
  }, [varB, needVote, currentStakePair, pairData]);

  return null;
}

const mapStateToProps = ({ stake, user }) => {
  return {
    ...stake,
    ...user,
  };
};

export default connect(mapStateToProps)(GetData);
